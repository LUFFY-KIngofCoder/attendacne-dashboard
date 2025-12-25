import { useState, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import { ShieldAlert } from 'lucide-react';

export default function ForcePasswordChange() {
  const { user, refreshProfile, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', user?.id);
      if (profileError) throw profileError;

      await refreshProfile();
      setSuccess('Password updated successfully. Redirecting...');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update password.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full">
            <ShieldAlert className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Update Your Password</h1>
          <p className="text-gray-600 text-sm">
            For security, please set a new password before continuing.
          </p>
          {user?.email && <p className="text-gray-500 text-sm">Signed in as {user.email}</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
          {success && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{success}</div>}

          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </form>

        <div className="text-center">
          <button className="text-sm text-gray-500 hover:underline" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}



