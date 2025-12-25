import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { StatCard } from '../../components/Card';
import { Users, CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';
import Layout from '../../components/Layout';
import EmployeeManagement from './EmployeeManagement';
import AttendanceManagement from './AttendanceManagement';
import WorklogManagement from './WorklogManagement';
import AdminCalendar from './AdminCalendar';

type TabType = 'overview' | 'employees' | 'attendance' | 'worklogs' | 'calendar';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    pendingApprovals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [employeesRes, attendanceRes, approvalsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'employee').eq('is_active', true),
        supabase.from('attendance').select('status').eq('date', today),
        supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('is_approved', false),
      ]);

      const presentCount = attendanceRes.data?.filter((a) => a.status === 'present').length || 0;
      const totalEmployees = employeesRes.count || 0;
      const absentCount = totalEmployees - (attendanceRes.data?.length || 0);

      setStats({
        totalEmployees,
        presentToday: presentCount,
        absentToday: absentCount,
        pendingApprovals: approvalsRes.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview' },
    { id: 'employees' as TabType, label: 'Employees' },
    { id: 'attendance' as TabType, label: 'Attendance' },
    { id: 'worklogs' as TabType, label: 'Worklogs' },
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
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage employees, attendance, and worklogs</p>
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
                title="Total Employees"
                value={stats.totalEmployees}
                icon={Users}
                iconColor="text-blue-600"
                bgColor="bg-blue-50"
              />
              <StatCard
                title="Present Today"
                value={stats.presentToday}
                icon={CheckCircle}
                iconColor="text-green-600"
                bgColor="bg-green-50"
              />
              <StatCard
                title="Absent Today"
                value={stats.absentToday}
                icon={XCircle}
                iconColor="text-red-600"
                bgColor="bg-red-50"
              />
              <StatCard
                title="Pending Approvals"
                value={stats.pendingApprovals}
                icon={Clock}
                iconColor="text-yellow-600"
                bgColor="bg-yellow-50"
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('employees')}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors text-left"
                >
                  <h3 className="font-medium text-gray-900">Manage Employees</h3>
                  <p className="text-sm text-gray-600 mt-1">Add, edit, or remove employees</p>
                </button>
                <button
                  onClick={() => setActiveTab('attendance')}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors text-left"
                >
                  <h3 className="font-medium text-gray-900">View Attendance</h3>
                  <p className="text-sm text-gray-600 mt-1">Monitor and approve attendance</p>
                </button>
                <button
                  onClick={() => setActiveTab('worklogs')}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors text-left"
                >
                  <h3 className="font-medium text-gray-900">Review Worklogs</h3>
                  <p className="text-sm text-gray-600 mt-1">Check and approve work reports</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'employees' && <EmployeeManagement />}
        {activeTab === 'attendance' && <AttendanceManagement />}
        {activeTab === 'worklogs' && <WorklogManagement />}
        {activeTab === 'calendar' && <AdminCalendar />}
      </div>
    </Layout>
  );
}
