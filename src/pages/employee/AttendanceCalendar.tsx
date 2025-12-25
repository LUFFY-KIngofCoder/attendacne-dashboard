import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Attendance, Holiday, Event } from '../../types';
import { SectionCard } from '../../components/Card';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function AttendanceCalendar() {
  const { profile } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadAttendance();
    loadHolidays();
    loadEvents();
  }, [currentDate, profile]);

  const loadAttendance = async () => {
    if (!profile) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', profile.id)
      .gte('date', firstDay.toISOString().split('T')[0])
      .lte('date', lastDay.toISOString().split('T')[0]);

    setAttendance(data || []);
    setLoading(false);
  };

  const loadHolidays = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const { data } = await supabase
        .from('holidays')
        .select('*')
        .gte('date', `${year}-${String(month + 1).padStart(2, '0')}-01`)
        .lte('date', `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`)
        .eq('is_holiday', true);

      setHolidays(data || []);
    } catch (error) {
      console.error('Error loading holidays:', error);
    }
  };

  const loadEvents = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const { data } = await supabase
        .from('events')
        .select('*')
        .gte('date', `${year}-${String(month + 1).padStart(2, '0')}-01`)
        .lte('date', `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`)
        .order('name', { ascending: true });

      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const getAttendanceForDate = (day: number) => {
    // Fix: Use local date to avoid timezone issues
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateObj = new Date(year, month, day);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return attendance.find((a) => a.date === dateStr);
  };

  const getHolidayForDate = (day: number): Holiday | undefined => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.find((h) => h.date === dateStr && h.is_holiday);
  };

  const getEventsForDate = (day: number): Event[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => e.date === dateStr);
  };

  const getDateStr = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handleDayClick = (day: number) => {
    setSelectedDate(getDateStr(day));
    setShowModal(true);
  };

  const isWeekend = (day: number): boolean => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0; // Sunday only
  };

  const isHoliday = (day: number): boolean => {
    const holiday = getHolidayForDate(day);
    if (holiday) return true;
    const isWeekendDay = isWeekend(day);
    // Check if Sunday is explicitly marked as working day
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const weekendOverride = holidays.find(h => h.date === dateStr && !h.is_holiday);
    return isWeekendDay && !weekendOverride; // Default Sundays are holidays unless overridden
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-500';
      case 'half_day':
        return 'bg-yellow-500';
      case 'on_leave':
        return 'bg-blue-500';
      case 'absent':
        return 'bg-red-500';
      default:
        return 'bg-gray-300';
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: startingDayOfWeek }, (_, i) => i);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
    <SectionCard>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {emptyDays.map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square" />
          ))}
          {days.map((day) => {
            const attendanceRecord = getAttendanceForDate(day);
            const holiday = getHolidayForDate(day);
            const dateEvents = getEventsForDate(day);
            const isHolidayDay = isHoliday(day);
            const isToday =
              day === new Date().getDate() &&
              currentDate.getMonth() === new Date().getMonth() &&
              currentDate.getFullYear() === new Date().getFullYear();

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDayClick(day)}
                className={`aspect-square border rounded-lg p-2 flex flex-col items-center justify-center transition-all ${
                  isToday
                    ? 'border-blue-600 border-2 bg-blue-50'
                    : isHolidayDay
                    ? 'border-red-300 bg-red-50'
                    : dateEvents.length > 0
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-sm font-medium text-gray-900 mb-1">{day}</div>
                {isHolidayDay && holiday?.name && (
                  <div className="text-xs text-red-700 mb-1 truncate w-full text-center">
                    {holiday.name}
                  </div>
                )}
                {dateEvents.length > 0 && (
                  <div className="flex flex-col items-center space-y-1 mb-1">
                    {dateEvents.slice(0, 2).map((event) => (
                      <div key={event.id} className="w-full">
                        <div className="text-xs text-blue-700 truncate w-full text-center font-medium">
                          {event.name}
                        </div>
                      </div>
                    ))}
                    {dateEvents.length > 2 && (
                      <div className="text-xs text-blue-600 font-medium">+{dateEvents.length - 2}</div>
                    )}
                  </div>
                )}
                {attendanceRecord && (
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(attendanceRecord.status)}`} />
                    {attendanceRecord.is_approved ? (
                      <div className="w-2 h-2 bg-gray-800 rounded-full mt-1" />
                    ) : attendanceRecord.approved_by ? (
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-1" />
                    ) : null}
                    {attendanceRecord.work_mode && (attendanceRecord.status === 'present' || attendanceRecord.status === 'half_day') && (
                      <div className="text-[10px] text-gray-600 mt-1 uppercase">
                        {attendanceRecord.work_mode === 'wfh' ? 'WFH' : 'Physical'}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-600">Present</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-sm text-gray-600">Half Day</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm text-gray-600">On Leave</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm text-gray-600">Absent</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-800 rounded-full" />
            <span className="text-sm text-gray-600">Approved</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="text-sm text-gray-600">Denied</span>
          </div>
        </div>
      </div>
    </SectionCard>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedDate(null);
        }}
        title={
          selectedDate
            ? `Details for ${new Date(selectedDate).toLocaleDateString()}`
            : 'Date Details'
        }
      >
        {selectedDate ? (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Events</h4>
              {events.filter((e) => e.date === selectedDate).length === 0 ? (
                <p className="text-sm text-gray-600">No events for this date.</p>
              ) : (
                <div className="space-y-3">
                  {events
                    .filter((e) => e.date === selectedDate)
                    .map((event) => (
                      <div key={event.id} className="p-3 border border-blue-100 rounded-lg bg-blue-50">
                        <div className="text-sm font-semibold text-blue-900">{event.name}</div>
                        {event.description && (
                          <div className="text-sm text-blue-700 mt-1">{event.description}</div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Attendance</h4>
              {attendance.find((a) => a.date === selectedDate) ? (
                (() => {
                  const rec = attendance.find((a) => a.date === selectedDate)!;
                  const statusLabel =
                    rec.status === 'present'
                      ? 'Present'
                      : rec.status === 'half_day'
                      ? 'Half Day'
                      : rec.status === 'on_leave'
                      ? 'On Leave'
                      : 'Absent';
                  return (
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(rec.status)}`} />
                        <div className="text-sm font-semibold text-gray-900">{statusLabel}</div>
                        {rec.is_approved && (
                          <span className="text-xs text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">
                            Approved
                          </span>
                        )}
                      </div>
                      {(rec.status === 'present' || rec.status === 'half_day') && rec.work_mode && (
                        <div className="text-xs text-gray-700">
                          Work Mode: {rec.work_mode === 'wfh' ? 'Work From Home' : 'Physical'}
                        </div>
                      )}
                      {rec.reason && (
                        <div className="text-xs text-gray-600">Reason: {rec.reason}</div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <p className="text-sm text-gray-600">No attendance recorded for this date.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600">Select a date to view details.</p>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </>
  );
}
