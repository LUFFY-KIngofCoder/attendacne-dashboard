import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { SectionCard } from '../../components/Card';
import Button from '../../components/Button';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Holiday } from '../../types';

interface AttendanceSubmissionProps {
  onSuccess: () => void;
}

export default function AttendanceSubmission({ onSuccess }: AttendanceSubmissionProps) {
  const { profile } = useAuth();
  const [status, setStatus] = useState<'present' | 'half_day' | 'on_leave' | 'absent'>('present');
  const [workMode, setWorkMode] = useState<'wfh' | 'physical' | ''>('physical');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [isHoliday, setIsHoliday] = useState(false);
  const [todayHoliday, setTodayHoliday] = useState<Holiday | null>(null);
  const [weeklyWfhUsed, setWeeklyWfhUsed] = useState(0);

  useEffect(() => {
    checkTodayAttendance();
    checkTodayHoliday();
    loadWeeklyWfhUsage();
  }, [profile]);

  const checkTodayAttendance = async () => {
    if (!profile) return;

    // Fix: Use local date formatting
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', profile.id)
      .eq('date', todayStr)
      .maybeSingle();

    setTodayAttendance(data);
    if (data) {
      setStatus(data.status);
      setReason(data.reason || '');
      setWorkMode((data.work_mode as 'wfh' | 'physical') || '');
    }
  };

  const loadWeeklyWfhUsage = async () => {
    if (!profile || (profile as any).weekly_wfh_limit == null) return;

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon
    const diffToMonday = (dayOfWeek + 6) % 7; // days since Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() - diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(
      monday.getDate(),
    ).padStart(2, '0')}`;
    const endStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(
      sunday.getDate(),
    ).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('attendance')
      .select('status, work_mode, date')
      .eq('employee_id', profile.id)
      .gte('date', startStr)
      .lte('date', endStr);

    if (error) {
      console.error('Error loading weekly WFH usage:', error);
      return;
    }

    const used =
      data?.filter(
        (a) =>
          (a.status === 'present' || a.status === 'half_day') &&
          a.work_mode === 'wfh',
      ).length || 0;

    setWeeklyWfhUsed(used);
  };

  const checkTodayHoliday = async () => {
    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      // Check if today is Sunday (default holiday)
      const dayOfWeek = today.getDay();
      const isSunday = dayOfWeek === 0;

      // Check database for holiday
      const { data } = await supabase
        .from('holidays')
        .select('*')
        .eq('date', todayStr)
        .maybeSingle();

      if (data) {
        setTodayHoliday(data);
        setIsHoliday(data.is_holiday);
      } else if (isSunday) {
        // Default: Sundays are holidays
        setIsHoliday(true);
      } else {
        setIsHoliday(false);
      }
    } catch (error) {
      console.error('Error checking holiday:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const weeklyLimit = (profile as any).weekly_wfh_limit as number | null | undefined;
    const wfhLimitReached =
      weeklyLimit != null &&
      (status === 'present' || status === 'half_day') &&
      workMode === 'wfh' &&
      weeklyWfhUsed >= weeklyLimit;

    if (wfhLimitReached) {
      setMessage({
        type: 'error',
        text: `You have used all your Work From Home days (${weeklyLimit}) for this week.`,
      });
      return;
    }

    // Require work mode for present/half_day
    if ((status === 'present' || status === 'half_day') && !workMode) {
      setMessage({ type: 'error', text: 'Please choose Work From Home or Physical.' });
      return;
    }

    if (isHoliday) {
      setMessage({ type: 'error', text: 'Cannot mark attendance on holidays. Today is a holiday.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Fix: Use local date formatting
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const checkInTime = status === 'present' || status === 'half_day' ? new Date().toISOString() : null;

      if (todayAttendance) {
        const { error } = await supabase
          .from('attendance')
          .update({
            status,
            reason: reason || null,
            work_mode: status === 'present' || status === 'half_day' ? workMode : null,
          })
          .eq('id', todayAttendance.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Attendance updated successfully!' });
      } else {
        const { error } = await supabase.from('attendance').insert({
          employee_id: profile.id,
          date: todayStr,
          status,
          work_mode: status === 'present' || status === 'half_day' ? workMode : null,
          reason: reason || null,
          check_in_time: checkInTime,
        });

        if (error) throw error;
        setMessage({ type: 'success', text: 'Attendance marked successfully!' });
      }

      checkTodayAttendance();
      onSuccess();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to submit attendance' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard title="Mark Your Attendance">
      {isHoliday && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">
              Today is a holiday{todayHoliday?.name ? `: ${todayHoliday.name}` : ''}
            </p>
            <p className="text-sm text-red-700 mt-1">Attendance cannot be marked on holidays.</p>
          </div>
        </div>
      )}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-start space-x-2 ${
            message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
            {message.text}
          </p>
        </div>
      )}

      {todayAttendance && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            You have already marked your attendance for today. You cannot change it. Please contact your
            manager or admin for any corrections.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Attendance Status</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { value: 'present', label: 'Present', color: 'green' },
              { value: 'half_day', label: 'Half Day', color: 'yellow' },
              { value: 'on_leave', label: 'On Leave', color: 'blue' },
            ].map((option) => (
              <label
                key={option.value}
                className={`relative flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  status === option.value
                    ? `border-${option.color}-600 bg-${option.color}-50`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value={option.value}
                  checked={status === option.value}
                  onChange={(e) => {
                    if (todayAttendance) return;
                    const nextStatus = e.target.value as typeof status;
                    setStatus(nextStatus);
                    if (nextStatus === 'present' || nextStatus === 'half_day') {
                      setWorkMode(workMode || 'physical');
                    } else {
                      setWorkMode('');
                    }
                  }}
                  disabled={!!todayAttendance}
                  className="sr-only"
                />
                <span className="font-medium text-gray-900">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

      {(status === 'present' || status === 'half_day') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Work Mode</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { value: 'physical', label: 'Physical (On-site)', desc: 'You are working from the office or client site.' },
              { value: 'wfh', label: 'Work From Home', desc: 'You are working remotely today.' },
            ].map((option) => (
              <label
                key={option.value}
                className={`relative block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  workMode === option.value
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="workMode"
                  value={option.value}
                  checked={workMode === option.value}
                  onChange={() => {
                    if (todayAttendance) return;
                    setWorkMode(option.value as 'wfh' | 'physical');
                  }}
                  disabled={!!todayAttendance}
                  className="sr-only"
                />
                <div className="font-medium text-gray-900">{option.label}</div>
                <div className="text-sm text-gray-600 mt-1">{option.desc}</div>
              </label>
            ))}
          </div>
        </div>
      )}

        {(status === 'on_leave' || status === 'half_day') && (
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason {status === 'on_leave' && <span className="text-red-600">*</span>}
            </label>
            <textarea
              id="reason"
              rows={4}
              required={status === 'on_leave'}
              value={reason}
              onChange={(e) => {
                if (todayAttendance) return;
                setReason(e.target.value);
              }}
              placeholder="Please provide a reason..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-gray-600">
            Date: <span className="font-medium text-gray-900">{new Date().toLocaleDateString()}</span>
          </p>
          <Button type="submit" variant="primary" size="lg" disabled={loading || isHoliday || !!todayAttendance}>
            {loading ? 'Submitting...' : todayAttendance ? 'Update Attendance' : 'Mark Attendance'}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
