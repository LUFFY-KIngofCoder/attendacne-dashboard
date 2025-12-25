import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import Loading from './components/Loading';
import ForcePasswordChange from './pages/ForcePasswordChange';

function AppContent() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!user || !profile) {
    return <Login />;
  }

  // Check if user is inactive - prevent login
  if (!profile.is_active) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Account Inactive</h1>
            <p className="text-gray-600 mt-2">
              Your account has been deactivated. Please contact your administrator for assistance.
            </p>
          </div>
          <button
            onClick={() => {
              supabase.auth.signOut();
            }}
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Enforce password change for users flagged by admin
  if ((profile as any).must_change_password) {
    return <ForcePasswordChange />;
  }

  if (profile.role === 'admin') {
    return <AdminDashboard />;
  }

  return <EmployeeDashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
