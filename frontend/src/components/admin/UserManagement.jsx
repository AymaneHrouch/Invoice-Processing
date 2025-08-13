import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts';
import { getAllUsers, createUser, deleteUser, updateUser } from '@/api/users';

const fetchUsers = async () => {
  const { users } = await getAllUsers();
  return users;
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'USER',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers().then(setUsers);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    // Clear specific field error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.full_name || form.full_name.length < 3) {
      newErrors.full_name = 'Full name must be at least 3 characters';
    }

    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!editingUser && (!form.password || form.password.length < 8)) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (editingUser && form.password && form.password.length < 8) {
      newErrors.password =
        'Password must be at least 8 characters (leave empty to keep current)';
    }

    return newErrors;
  };
  const handleAdd = async () => {
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setLoading(true);
    try {
      const userPayload = {
        email: form.email,
        full_name: form.full_name,
        password: form.password,
        role: form.role,
      };
      await createUser(userPayload);
      setForm({ full_name: '', email: '', password: '', role: 'USER' });
      setErrors({});
      fetchUsers().then(setUsers);
    } catch (error) {
      console.error('Error creating user:', error);
      setErrors({ general: 'Failed to create user. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setForm({
      full_name: user.full_name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'USER',
    });
  };

  const handleUpdate = async () => {
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setLoading(true);
    try {
      const userId = editingUser._id;
      const updatePayload = {
        full_name: form.full_name,
        role: form.role,
      };

      // Only include password if it's provided
      if (form.password && form.password.length >= 8) {
        updatePayload.password = form.password;
      }

      await updateUser(userId, updatePayload);
      setEditingUser(null);
      setForm({ full_name: '', email: '', password: '', role: 'USER' });
      setErrors({});
      fetchUsers().then(setUsers);
    } catch (error) {
      console.error('Error updating user:', error);
      setErrors({ general: 'Failed to update user. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteUser(id);
    fetchUsers().then(setUsers);
  };

  const { isDarkMode } = useTheme();
  return (
    <div
      className={`w-full mt-8 rounded-xl shadow-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-8`}
    >
      <h2
        className={`text-2xl font-bold mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
      >
        User Management
      </h2>
      <form
        className="mb-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          editingUser ? handleUpdate() : handleAdd();
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <input
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              placeholder="Full Name"
              className={`border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 w-full ${
                errors.full_name
                  ? 'border-red-500 focus:ring-red-300'
                  : isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-800'
                    : 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-300'
              }`}
            />
            {errors.full_name && (
              <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>
            )}
          </div>

          <div>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              disabled={editingUser} // Can't change email when editing
              className={`border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 w-full ${
                errors.email
                  ? 'border-red-500 focus:ring-red-300'
                  : isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-800'
                    : 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-300'
              } ${editingUser ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder={editingUser ? 'New Password (optional)' : 'Password'}
              className={`border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 w-full ${
                errors.password
                  ? 'border-red-500 focus:ring-red-300'
                  : isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-800'
                    : 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-300'
              }`}
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password}</p>
            )}
            {!errors.password && !editingUser && (
              <p className="text-gray-500 text-xs mt-1">Min 8 chars</p>
            )}
            {!errors.password && editingUser && (
              <p className="text-gray-500 text-xs mt-1">Optional</p>
            )}
          </div>

          <div>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className={`border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 w-full ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white focus:ring-purple-800' : 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-purple-300'}`}
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading} className="w-full md:w-auto">
            {loading
              ? editingUser
                ? 'Updating...'
                : 'Adding...'
              : editingUser
                ? 'Update User'
                : 'Add User'}
          </Button>
          {editingUser && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingUser(null);
                setForm({
                  full_name: '',
                  email: '',
                  password: '',
                  role: 'USER',
                });
                setErrors({});
              }}
            >
              Cancel
            </Button>
          )}
        </div>

        {/* General error message */}
        {errors.general && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {errors.general}
          </div>
        )}
      </form>
      <div
        className={`overflow-x-auto rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} bg-opacity-90`}
      >
        <table className="min-w-full divide-y divide-gray-200">
          <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Full Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className={isDarkMode ? 'bg-gray-800' : 'bg-white'}>
            {users.map((user) => (
              <tr key={user._id} className="border-t">
                <td className="px-4 py-2 whitespace-nowrap">
                  {user.full_name}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">{user.email}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(user)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(user.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
