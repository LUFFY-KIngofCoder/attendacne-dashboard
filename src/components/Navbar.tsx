import { useAuth } from '../contexts/AuthContext';
import { LogOut, User } from 'lucide-react';
import logo from '../../logo/logo.svg';

export default function Navbar() {
  const { profile, signOut } = useAuth();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <div className="h-12 w-12 bg-blue-50 border border-blue-100 rounded-lg overflow-hidden flex items-center justify-center">
              <img src={logo} alt="Logo" className="h-7 w-7 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Attendance & Worklog
              </h1>
              <p className="text-xs text-gray-500">
                {profile?.role === 'admin' ? 'Admin Portal' : 'Employee Portal'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-gray-600" />
              <div className="text-sm">
                <div className="font-medium text-gray-900">{profile?.full_name}</div>
                <div className="text-gray-500">{profile?.email}</div>
              </div>
            </div>

            <button
              onClick={signOut}
              className="flex items-center space-x-1 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
