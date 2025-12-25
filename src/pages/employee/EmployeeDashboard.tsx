import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { StatCard } from '../../components/Card';
import { Calendar, CheckCircle, Clock, FileText } from 'lucide-react';
import Layout from '../../components/Layout';
import AttendanceSubmission from './AttendanceSubmission';
import WorklogSubmission from './WorklogSubmission';
import AttendanceCalendar from './AttendanceCalendar';

type TabType = 'overview' | 'attendance' | 'worklog' | 'calendar';

export default function EmployeeDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState({
    presentDays: 0,
    totalHours: 0,
    pendingApprovals: 0,
    thisMonthDays: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [profile]);

  const loadStats = async () => {
    if (!profile) return;

    try {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];

      const [attendanceRes, worklogsRes, pendingRes] = await Promise.all([
        supabase
          .from('attendance')
          .select('status')
          .eq('employee_id', profile.id)
          .gte('date', startDate)
          .lte('date', endDate),
        supabase
          .from('worklogs')
          .select('hours_spent')
          .eq('employee_id', profile.id)
          .gte('date', startDate)
          .lte('date', endDate),
        supabase
          .from('attendance')
          .select('id', { count: 'exact', head: true })
          .eq('employee_id', profile.id)
          .eq('is_approved', false),
      ]);

      const presentCount =
        attendanceRes.data?.filter((a) => a.status === 'present' || a.status === 'half_day').length || 0;
      const totalHours = worklogsRes.data?.reduce((sum, w) => sum + Number(w.hours_spent), 0) || 0;

      setStats({
        presentDays: presentCount,
        totalHours,
        pendingApprovals: pendingRes.count || 0,
        thisMonthDays: attendanceRes.data?.length || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview' },
    { id: 'attendance' as TabType, label: 'Mark Attendance' },
    { id: 'worklog' as TabType, label: 'Submit Worklog' },
    { id: 'calendar' as TabType, label: 'Calendar' },
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-600 mt-1">Track your attendance and submit daily worklogs</p>
        </div>

        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Days Present"
                value={stats.presentDays}
                icon={CheckCircle}
                iconColor="text-green-600"
                bgColor="bg-green-50"
              />
              <StatCard
                title="Total Hours"
                value={`${stats.totalHours}h`}
                icon={Clock}
                iconColor="text-blue-600"
                bgColor="bg-blue-50"
              />
              <StatCard
                title="Pending Approvals"
                value={stats.pendingApprovals}
                icon={FileText}
                iconColor="text-yellow-600"
                bgColor="bg-yellow-50"
              />
              <StatCard
                title="This Month"
                value={stats.thisMonthDays}
                icon={Calendar}
                iconColor="text-purple-600"
                bgColor="bg-purple-50"
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab('attendance')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-all text-left group"
                >
                  <CheckCircle className="h-8 w-8 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold text-gray-900 mb-1">Mark Attendance</h3>
                  <p className="text-sm text-gray-600">Record your attendance for today</p>
                </button>
                <button
                  onClick={() => setActiveTab('worklog')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-all text-left group"
                >
                  <FileText className="h-8 w-8 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold text-gray-900 mb-1">Submit Worklog</h3>
                  <p className="text-sm text-gray-600">Report your daily tasks and hours</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && <AttendanceSubmission onSuccess={loadStats} />}
        {activeTab === 'worklog' && <WorklogSubmission onSuccess={loadStats} />}
        {activeTab === 'calendar' && <AttendanceCalendar />}
      </div>
    </Layout>
  );
}
