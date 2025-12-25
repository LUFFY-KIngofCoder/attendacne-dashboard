import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Worklog } from '../../types';
import { SectionCard } from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { CheckCircle, AlertCircle, Edit2 } from 'lucide-react';

interface WorklogSubmissionProps {
  onSuccess: () => void;
}

export default function WorklogSubmission({ onSuccess }: WorklogSubmissionProps) {
  const { profile } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [tasksCompleted, setTasksCompleted] = useState('');
  const [hoursSpent, setHoursSpent] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [recentWorklogs, setRecentWorklogs] = useState<Worklog[]>([]);
  const [editingWorklog, setEditingWorklog] = useState<Worklog | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    loadRecentWorklogs();
  }, [profile]);

  const loadRecentWorklogs = async () => {
    if (!profile) return;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await supabase
        .from('worklogs')
        .select('*')
        .eq('employee_id', profile.id)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

    setRecentWorklogs(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.from('worklogs').insert({
        employee_id: profile.id,
        date,
        tasks_completed: tasksCompleted,
        hours_spent: parseFloat(hoursSpent),
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Worklog submitted successfully!' });
      setTasksCompleted('');
      setHoursSpent('');
      setDate(new Date().toISOString().split('T')[0]);
      loadRecentWorklogs();
      onSuccess();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to submit worklog' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (worklog: Worklog) => {
    setEditingWorklog(worklog);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorklog) return;

    try {
      const { error } = await supabase
        .from('worklogs')
        .update({
          tasks_completed: editingWorklog.tasks_completed,
          hours_spent: editingWorklog.hours_spent,
        })
        .eq('id', editingWorklog.id);

      if (error) throw error;

      setIsEditModalOpen(false);
      setEditingWorklog(null);
      loadRecentWorklogs();
      setMessage({ type: 'success', text: 'Worklog updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update worklog' });
    }
  };

  const getMaxDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getMinDate = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return sevenDaysAgo.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Submit Your Worklog">
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                Date <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                id="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={getMinDate()}
                max={getMaxDate()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">You can submit worklogs for the last 7 days</p>
            </div>

            <div>
              <label htmlFor="hours" className="block text-sm font-medium text-gray-700 mb-2">
                Hours Spent <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                id="hours"
                required
                min="0"
                max="24"
                step="0.5"
                value={hoursSpent}
                onChange={(e) => setHoursSpent(e.target.value)}
                placeholder="e.g., 8"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="tasks" className="block text-sm font-medium text-gray-700 mb-2">
              Tasks Completed <span className="text-red-600">*</span>
            </label>
            <textarea
              id="tasks"
              rows={6}
              required
              value={tasksCompleted}
              onChange={(e) => setTasksCompleted(e.target.value)}
              placeholder="Describe the tasks you completed today..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" variant="primary" size="lg" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Worklog'}
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Recent Worklogs">
        <div className="space-y-4">
          {recentWorklogs.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No recent worklogs found</p>
          ) : (
            recentWorklogs.map((worklog) => (
              <div key={worklog.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(worklog.date).toLocaleDateString()}
                      </span>
                      <span className="text-sm text-gray-600">{worklog.hours_spent}h</span>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          worklog.is_approved
                            ? 'bg-green-100 text-green-800'
                            : worklog.approved_by
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {worklog.is_approved
                          ? 'Approved'
                          : worklog.approved_by
                          ? 'Denied'
                          : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{worklog.tasks_completed}</p>
                    {worklog.review_note && (
                      <p className="mt-1 text-xs text-red-700">
                        Admin note: <span className="font-medium">{worklog.review_note}</span>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleEdit(worklog)}
                    className="ml-4 text-blue-600 hover:text-blue-900 disabled:opacity-50"
                    disabled={worklog.is_approved}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingWorklog(null);
        }}
        title="Edit Worklog"
        size="lg"
      >
        {editingWorklog && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="text"
                value={new Date(editingWorklog.date).toLocaleDateString()}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hours Spent</label>
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                required
                value={editingWorklog.hours_spent}
                onChange={(e) => setEditingWorklog({ ...editingWorklog, hours_spent: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tasks Completed</label>
              <textarea
                rows={6}
                required
                value={editingWorklog.tasks_completed}
                onChange={(e) => setEditingWorklog({ ...editingWorklog, tasks_completed: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingWorklog(null);
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
