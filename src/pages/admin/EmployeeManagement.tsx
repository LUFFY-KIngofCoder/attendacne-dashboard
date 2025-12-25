import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';
import { ProfileWithDepartment, Department } from '../../types';
import { SectionCard } from '../../components/Card';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import { Plus, Edit2, Trash2, Search, MoreVertical, XCircle, CheckCircle } from 'lucide-react';
import { useAuth, setCreatingUserFlag } from '../../contexts/AuthContext';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

// Debug helper to verify service role key is loaded at runtime
// Remove after confirming it prints "true" in the browser console.
console.info('[debug] service role key loaded?', !!serviceRoleKey);

export default function EmployeeManagement() {
  const { profile: adminProfile } = useAuth();
  const [employees, setEmployees] = useState<ProfileWithDepartment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<ProfileWithDepartment | null>(null);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);
  const [showDeleteMenu, setShowDeleteMenu] = useState<string | null>(null);
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    department_id: '',
    role: 'employee' as 'admin' | 'employee',
    weekly_wfh_limit: '',
  });

  useEffect(() => {
    loadEmployees();
    loadDepartments();
  }, [showInactive]);

  // Close delete menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDeleteMenu && !(event.target as Element).closest('.delete-menu-container')) {
        setShowDeleteMenu(null);
      }
    };

    if (showDeleteMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDeleteMenu]);

  // Handle dropdown positioning to prevent it from being cut off
  useEffect(() => {
    const updateMenuPosition = () => {
      if (showDeleteMenu) {
        const menuElement = menuRefs.current[showDeleteMenu];
        const buttonElement = document.querySelector(`[data-employee-id="${showDeleteMenu}"]`) as HTMLElement;
        
        if (menuElement && buttonElement) {
          const buttonRect = buttonElement.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;
          const menuHeight = 90; // Approximate height of the dropdown menu
          
          // Calculate space available
          const spaceBelow = viewportHeight - buttonRect.bottom;
          const spaceAbove = buttonRect.top;
          
          // Use fixed positioning relative to viewport
          menuElement.style.position = 'fixed';
          menuElement.style.zIndex = '9999';
          
          // Calculate horizontal position (right-aligned with button)
          const rightPosition = viewportWidth - buttonRect.right;
          menuElement.style.right = `${rightPosition}px`;
          
          // Calculate vertical position
          if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
            // Position above the button
            menuElement.style.bottom = `${viewportHeight - buttonRect.top + 4}px`;
            menuElement.style.top = 'auto';
          } else {
            // Position below the button
            menuElement.style.top = `${buttonRect.bottom + 4}px`;
            menuElement.style.bottom = 'auto';
          }
        }
      }
    };

    updateMenuPosition();

    // Update position on scroll and resize
    window.addEventListener('scroll', updateMenuPosition, true);
    window.addEventListener('resize', updateMenuPosition);

    return () => {
      window.removeEventListener('scroll', updateMenuPosition, true);
      window.removeEventListener('resize', updateMenuPosition);
    };
  }, [showDeleteMenu]);

  const loadEmployees = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select(`
          *,
          department:departments(*)
        `);

      // Filter: Show only active employees in main list, inactive when toggle is on
      if (!showInactive) {
        query = query.eq('is_active', true);
      } else {
        query = query.eq('is_active', false);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    const { data } = await supabase.from('departments').select('*').order('name');
    setDepartments(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (isCreatingUser) return;

    try {
      if (editingEmployee) {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            phone: formData.phone || null,
            department_id: formData.department_id || null,
            role: formData.role,
            weekly_wfh_limit: formData.weekly_wfh_limit === '' ? null : Number(formData.weekly_wfh_limit),
          })
          .eq('id', editingEmployee.id);

        if (error) {
          console.error('Update error:', error);
          throw new Error(error.message || 'Failed to update employee');
        }
      } else {
        // Set flag to prevent UI updates during user creation
        setIsCreatingUser(true);
        setCreatingUserFlag(true); // Tell AuthContext to ignore auth state changes

        try {
          // Save current admin session before creating user
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          
          if (!currentSession) {
            throw new Error('Admin session not found. Please log in again.');
          }

          // Store admin session data to restore later
          const adminSessionData = {
            access_token: currentSession.access_token,
            refresh_token: currentSession.refresh_token,
          };
          const adminUserId = currentSession.user.id;

          // Create new user (this will auto-sign-in as the new user)
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                full_name: formData.full_name,
                role: formData.role,
              },
            },
          });

          if (authError) {
            console.error('SignUp error:', authError);
            throw new Error(authError.message || 'Failed to create user account');
          }

          if (!authData.user) {
            throw new Error('User creation failed - no user returned');
          }

          const newUserId = authData.user.id;

          // Immediately sign out the new user
          await supabase.auth.signOut();
          
          // Small delay to ensure signOut completes
          await new Promise((resolve) => setTimeout(resolve, 100));
          
          // Restore admin session
          const { error: restoreError } = await supabase.auth.setSession({
            access_token: adminSessionData.access_token,
            refresh_token: adminSessionData.refresh_token,
          });

          if (restoreError) {
            console.error('Failed to restore admin session:', restoreError);
            throw new Error('Failed to restore admin session. Please try again.');
          }

          // Verify we're back to admin session
          const { data: { session: restoredSession } } = await supabase.auth.getSession();
          if (!restoredSession || restoredSession.user.id !== adminUserId) {
            throw new Error('Session restoration failed. Please refresh the page and try again.');
          }

          // Wait a bit more to ensure everything is stable
          await new Promise((resolve) => setTimeout(resolve, 200));

          // Wait a bit for the trigger to create the profile
          await new Promise((resolve) => setTimeout(resolve, 300));

          // Update profile with all fields (trigger may have created basic profile)
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              full_name: formData.full_name,
              phone: formData.phone || null,
              department_id: formData.department_id || null,
              role: formData.role,
              weekly_wfh_limit: formData.weekly_wfh_limit === '' ? null : Number(formData.weekly_wfh_limit),
              is_active: true,
              must_change_password: true,
            })
            .eq('id', newUserId);

          if (profileError) {
            console.error('Profile update error:', profileError);
            // If update fails, try insert (in case trigger didn't fire)
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: newUserId,
                email: formData.email,
                full_name: formData.full_name,
                phone: formData.phone || null,
                department_id: formData.department_id || null,
                role: formData.role,
                weekly_wfh_limit: formData.weekly_wfh_limit === '' ? null : Number(formData.weekly_wfh_limit),
                is_active: true,
                must_change_password: true,
              });

            if (insertError) {
              console.error('Profile insert error:', insertError);
              throw new Error(insertError.message || 'Failed to create employee profile');
            }
          }

          // Success! Show notification and close modal
          setSuccessMessage(`Employee "${formData.full_name}" added successfully!`);
          setIsModalOpen(false);
          resetForm();
          loadEmployees();

          // Clear success message after 3 seconds
          setTimeout(() => {
            setSuccessMessage(null);
          }, 3000);
        } finally {
          // Always reset the flags
          setIsCreatingUser(false);
          setCreatingUserFlag(false); // Re-enable auth state updates
        }
      }

      // Only close modal and reload if editing (not creating)
      if (editingEmployee) {
        setIsModalOpen(false);
        resetForm();
        loadEmployees();
      }
    } catch (error) {
      console.error('Error saving employee:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error saving employee: ${errorMessage}\n\nCheck the browser console for details.`);
    }
  };

  const handleEdit = (employee: ProfileWithDepartment) => {
    setEditingEmployee(employee);
    setFormData({
      email: employee.email,
      password: '',
      full_name: employee.full_name,
      phone: employee.phone || '',
      department_id: employee.department_id || '',
      role: employee.role,
      weekly_wfh_limit: (employee as any).weekly_wfh_limit != null ? String((employee as any).weekly_wfh_limit) : '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this employee?\n\nThey will be marked as inactive but can be reactivated later.')) return;

    try {
      const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', id);

      if (error) throw error;
      loadEmployees();
      setShowDeleteMenu(null);
    } catch (error) {
      console.error('Error deactivating employee:', error);
      alert('Error deactivating employee. Please try again.');
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      const { error } = await supabase.from('profiles').update({ is_active: true }).eq('id', id);

      if (error) throw error;
      loadEmployees();
      alert('Employee reactivated successfully.');
    } catch (error) {
      console.error('Error reactivating employee:', error);
      alert('Error reactivating employee. Please try again.');
    }
  };

  const handleHardDelete = async (id: string) => {
    const employee = employees.find(emp => emp.id === id);
    const employeeName = employee?.full_name || 'this employee';
    
    const confirmMessage = `⚠️ PERMANENT DELETE ⚠️\n\nThis will completely remove ${employeeName} and ALL their data from the database:\n\n• User account\n• All attendance records\n• All worklogs\n• All related data\n\nThis action CANNOT be undone!\n\nAre you absolutely sure you want to permanently delete ${employeeName}?`;
    
    if (!confirm(confirmMessage)) {
      setShowDeleteMenu(null);
      return;
    }

    // Double confirmation
    if (!confirm('FINAL CONFIRMATION:\n\nYou are about to PERMANENTLY DELETE this user.\n\nType "DELETE" in the next prompt to confirm.')) {
      setShowDeleteMenu(null);
      return;
    }

    try {
      setDeletingEmployeeId(id);
      
      // Delete from profiles table (this will cascade delete attendance & worklogs)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Also attempt to delete from Supabase Auth (requires service role key)
      if (supabaseAdmin) {
        try {
          const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
          if (authDeleteError) {
            console.error('Auth delete error:', authDeleteError);
            alert(
              `Profile deleted, but auth user could not be removed automatically.\n\nPlease delete from Supabase Dashboard → Authentication → Users.\nReason: ${authDeleteError.message}`,
            );
          } else {
            alert(`User ${employeeName} has been permanently deleted (profile + auth).`);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          console.error('Auth delete exception:', err);
          alert(
            `Profile deleted, but auth user could not be removed automatically.\n\nPlease delete from Supabase Dashboard → Authentication → Users.\nReason: ${message}`,
          );
        }
      } else {
        alert(
          `User ${employeeName} has been permanently deleted from profiles.\n\nTo also remove the auth account:\n1) Set VITE_SUPABASE_SERVICE_ROLE_KEY in your .env\n2) Restart the app\n3) Delete again\n\nOr delete manually in Supabase Dashboard → Authentication → Users.`,
        );
      }
      
      loadEmployees();
      setShowDeleteMenu(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user. Please check the console for details.');
    } finally {
      setDeletingEmployeeId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      full_name: '',
      phone: '',
      department_id: '',
      role: 'employee',
      weekly_wfh_limit: '',
    });
    setEditingEmployee(null);
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-2 animate-in slide-in-from-top">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800 font-medium">{successMessage}</p>
        </div>
      )}
      <SectionCard>
        {showInactive && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">Inactive Employees</h3>
            <p className="text-sm text-yellow-800">
              Viewing deactivated employees. You can reactivate them or permanently delete them.
            </p>
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowInactive(!showInactive)}
              variant={showInactive ? 'primary' : 'secondary'}
              className="flex items-center space-x-2"
            >
              <span>{showInactive ? 'Show Active' : 'Show Inactive'}</span>
            </Button>
            {!showInactive && (
              <Button
                onClick={() => {
                  resetForm();
                  setIsModalOpen(true);
                }}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Employee</span>
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{employee.full_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{employee.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {(employee.department as any)?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        employee.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {employee.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        employee.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {employee.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {showInactive ? (
                        // In inactive view: Show reactivate and delete buttons directly
                        <>
                          <button
                            onClick={() => handleReactivate(employee.id)}
                            className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                            title="Reactivate employee"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleHardDelete(employee.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                            title="Permanently delete"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        // In active view: Show edit and delete menu
                        <>
                          <button
                            onClick={() => handleEdit(employee)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                            title="Edit employee"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <div className="relative delete-menu-container">
                            <button
                              onClick={() => setShowDeleteMenu(showDeleteMenu === employee.id ? null : employee.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                              title="Delete options"
                              disabled={deletingEmployeeId === employee.id}
                              data-employee-id={employee.id}
                            >
                              {deletingEmployeeId === employee.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                              ) : (
                                <MoreVertical className="h-4 w-4" />
                              )}
                            </button>
                            {showDeleteMenu === employee.id && (
                              <div 
                                ref={(el) => {
                                  if (el) menuRefs.current[employee.id] = el;
                                }}
                                className="fixed w-56 bg-white rounded-md shadow-lg border border-gray-200"
                                style={{ zIndex: 9999 }}
                              >
                                <div className="py-1">
                                  <button
                                    onClick={() => handleDelete(employee.id)}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span>Deactivate</span>
                                  </button>
                                  <button
                                    onClick={() => handleHardDelete(employee.id)}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 border-t border-gray-200"
                                  >
                                    <XCircle className="h-4 w-4" />
                                    <span className="font-medium">Permanently Delete</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12 text-gray-500">No employees found</div>
          )}
        </div>
      </SectionCard>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingEmployee ? 'Edit Employee' : 'Add New Employee'}
      >
        {!editingEmployee && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <strong>Note:</strong> If user creation fails, check Supabase Dashboard → Authentication → Settings and disable "Enable email confirmations" for development.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              disabled={!!editingEmployee}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          {!editingEmployee && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              pattern="^[0-9]{10}$"
              maxLength={10}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="10 digit mobile number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">Enter a 10 digit phone number (numbers only).</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={formData.department_id}
              onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weekly Work From Home Limit
            </label>
            <input
              type="number"
              min={0}
              value={formData.weekly_wfh_limit}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  weekly_wfh_limit: e.target.value === '' ? '' : String(Math.max(0, Number(e.target.value))),
                })
              }
              placeholder="e.g. 2 (number of WFH days allowed per week)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave empty for unlimited WFH, or set how many days per week this employee can work from home.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'employee' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isCreatingUser}>
              {isCreatingUser ? 'Creating...' : editingEmployee ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
