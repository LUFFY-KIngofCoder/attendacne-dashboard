import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AttendanceWithProfile } from '../../types';
import { SectionCard } from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { Check, X, Download, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AttendanceManagement() {
  const { profile } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [emailFilter, setEmailFilter] = useState('');
  const [editingRecord, setEditingRecord] = useState<AttendanceWithProfile | null>(null);

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadAttendance();
    }
  }, [startDate, endDate, statusFilter]);

  const loadAttendance = async () => {
    try {
      let query = supabase
        .from('attendance')
        .select(`
          *,
          employee:profiles!attendance_employee_id_fkey(*),
          approver:profiles!attendance_approved_by_fkey(*)
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'present' | 'half_day' | 'on_leave' | 'absent');
      }

      const { data, error } = await query;

      if (error) throw error;
      setAttendance(data || []);
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('attendance')
        .update({
          is_approved: true,
          approved_by: profile?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      loadAttendance();
    } catch (error) {
      console.error('Error approving attendance:', error);
    }
  };

  const handleReject = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to reject this attendance record?\n\nThe employee status will stay the same, but it will be marked as Denied.',
      )
    )
      return;

    try {
      const { error } = await supabase
        .from('attendance')
        .update({
          is_approved: false,
          approved_by: profile?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      loadAttendance();
    } catch (error) {
      console.error('Error rejecting attendance:', error);
    }
  };

  const handleEdit = (record: AttendanceWithProfile) => {
    setEditingRecord(record);
    setIsEditModalOpen(true);
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    try {
      const isWorkingDay = editingRecord.status === 'present' || editingRecord.status === 'half_day';
      const payload: any = {
        status: editingRecord.status,
        reason: editingRecord.reason,
        is_approved: true,
        approved_by: profile?.id,
        approved_at: new Date().toISOString(),
      };

      // Allow admin to set work_mode only for working days
      if (isWorkingDay) {
        payload.work_mode = (editingRecord as any).work_mode || 'physical';
      } else {
        payload.work_mode = null;
      }

      const { error } = await supabase
        .from('attendance')
        .update(payload)
        .eq('id', editingRecord.id);

      if (error) throw error;
      setIsEditModalOpen(false);
      setEditingRecord(null);
      loadAttendance();
    } catch (error) {
      console.error('Error updating attendance:', error);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Employee', 'Status', 'Check In', 'Check Out', 'Approved'];
    const rows = attendance.map((record) => [
      record.date,
      (record.employee as any)?.full_name || '',
      record.status,
      record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString() : '-',
      record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString() : '-',
      record.is_approved ? 'Yes' : 'No',
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${startDate}_${endDate}.csv`;
    a.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'half_day':
        return 'bg-yellow-100 text-yellow-800';
      case 'on_leave':
        return 'bg-blue-100 text-blue-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAttendance = attendance.filter((record) => {
    if (!emailFilter.trim()) return true;
    const email = ((record.employee as any)?.email || '').toLowerCase();
    return email.includes(emailFilter.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="half_day">Half Day</option>
              <option value="on_leave">On Leave</option>
              <option value="absent">Absent</option>
            </select>
            <input
              type="text"
              placeholder="Filter by employee email"
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <Button onClick={exportToCSV} variant="secondary" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
        </div>

        <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Approved
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAttendance.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(record.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{(record.employee as any)?.full_name}</div>
                    <div className="text-sm text-gray-500">{(record.employee as any)?.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                        {record.status.replace('_', ' ')}
                      </span>
                      {(record.status === 'present' || record.status === 'half_day') && record.work_mode && (
                        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-blue-50 text-blue-800 border border-blue-100">
                          {record.work_mode === 'wfh' ? 'Work From Home' : 'Physical'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{record.reason || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        record.is_approved
                          ? 'bg-green-100 text-green-800'
                          : record.approved_by
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {record.is_approved ? 'Approved' : record.approved_by ? 'Denied' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(record)}
                        className="text-blue-600 hover:text-blue-900 px-2 py-1"
                      >
                        Edit
                      </button>
                      {!record.is_approved && !record.approved_by && (
                        <>
                          <button
                            onClick={() => handleApprove(record.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleReject(record.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {attendance.length === 0 && (
            <div className="text-center py-12 text-gray-500">No attendance records found</div>
          )}
        </div>
      </SectionCard>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingRecord(null);
        }}
        title="Edit Attendance Record"
      >
        {editingRecord && (
          <form onSubmit={handleUpdateRecord} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={editingRecord.status}
                onChange={(e) =>
                  setEditingRecord((prev) =>
                    prev
                      ? {
                          ...prev,
                          status: e.target.value as 'present' | 'half_day' | 'on_leave' | 'absent',
                          // Clear work_mode when not working day
                          ...(e.target.value === 'present' || e.target.value === 'half_day'
                            ? {}
                            : { work_mode: null }),
                        }
                      : prev,
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="present">Present</option>
                <option value="half_day">Half Day</option>
                <option value="on_leave">On Leave</option>
                <option value="absent">Absent</option>
              </select>
            </div>

            {(editingRecord.status === 'present' || editingRecord.status === 'half_day') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Mode</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    {
                      value: 'physical',
                      label: 'Physical (On-site)',
                      desc: 'Employee is working from office / client site.',
                    },
                    {
                      value: 'wfh',
                      label: 'Work From Home',
                      desc: 'Employee is working remotely.',
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`relative block p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        (editingRecord as any).work_mode === option.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="work_mode_admin"
                        value={option.value}
                        checked={(editingRecord as any).work_mode === option.value}
                        onChange={() =>
                          setEditingRecord((prev) => (prev ? { ...prev, work_mode: option.value as any } : prev))
                        }
                        className="sr-only"
                      />
                      <div className="font-medium text-gray-900 text-sm">{option.label}</div>
                      <div className="text-xs text-gray-600 mt-1">{option.desc}</div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <textarea
                value={editingRecord.reason || ''}
                onChange={(e) => setEditingRecord({ ...editingRecord, reason: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingRecord(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Update
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
