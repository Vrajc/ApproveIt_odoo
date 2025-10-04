import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Users,
  Settings,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  Building,
  X,
  Search,
  Eye,
  EyeOff
} from 'lucide-react';

export default function AdminPanel() {
  const { user } = useAuth();
  const { currencies } = useCurrency();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'companies') {
      fetchCompanies();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Authentication required. Please log in again.');
        return;
      }

      // Try multiple endpoints to ensure we get user data
      let response;
      try {
        response = await axios.get('/api/admin/users', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });
      } catch (adminError) {
        console.log('Admin users endpoint failed, trying fallback...');
        // Fallback to general users endpoint
        response = await axios.get('/api/users', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });
      }

      console.log('Users fetched:', response.data);
      
      let usersData = [];
      if (response.data.success !== false) {
        usersData = Array.isArray(response.data) ? response.data :
                   response.data.users || response.data.data || [];
      }
      
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      
      if (error.response?.status === 403) {
        toast.error('Access denied. Admin privileges required.');
      } else if (error.response?.status === 401) {
        toast.error('Authentication expired. Please log in again.');
      } else if (error.code === 'ECONNABORTED') {
        toast.error('Request timeout. Please check your connection.');
      } else {
        toast.error('Failed to load users. Please try again.');
      }
      
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let response;
      try {
        response = await axios.get('/api/admin/companies', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (adminError) {
        // Fallback: Try to get company info from user's company
        response = await axios.get('/api/company', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        // Transform single company to array format
        if (response.data && !Array.isArray(response.data)) {
          response.data = { companies: [response.data] };
        }
      }

      let companiesData = [];
      if (response.data.success !== false) {
        companiesData = Array.isArray(response.data) ? response.data :
                       response.data.companies || response.data.data || [];
      }
      
      setCompanies(companiesData);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      toast.error('Failed to load companies');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/admin/users/${userId}/status`, {
        isActive: !currentStatus
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error) {
      console.error('Toggle user status error:', error);
      toast.error('Failed to update user status');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'text-purple-400 bg-purple-400/20';
      case 'manager': return 'text-blue-400 bg-blue-400/20';
      case 'employee': return 'text-green-400 bg-green-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const tabs = [
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'companies', label: 'Companies', icon: Building },
    { id: 'settings', label: 'System Settings', icon: Settings }
  ];

  // Show access denied for non-admins
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <Shield className="mx-auto text-red-400 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-white/70">You do not have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="headline text-4xl text-white mb-2">Admin Panel</h1>
          <p className="text-white/70">Manage users, companies, and system settings</p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 mb-8"
        >
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Search and Filter */}
            <div className="glass-card p-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex gap-4 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={18} />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search users..."
                      className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all" className="bg-gray-800">All Roles</option>
                    <option value="admin" className="bg-gray-800">Admin</option>
                    <option value="manager" className="bg-gray-800">Manager</option>
                    <option value="employee" className="bg-gray-800">Employee</option>
                  </select>
                </div>
                
                <button
                  onClick={() => setShowUserModal(true)}
                  className="gradient-button px-6 py-2 rounded-lg font-medium flex items-center space-x-2"
                >
                  <UserPlus size={18} />
                  <span>Add User</span>
                </button>
              </div>
            </div>

            {/* Users List */}
            <div className="glass-card p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                </div>
              ) : filteredUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-left text-white/80 font-medium py-4">User</th>
                        <th className="text-left text-white/80 font-medium py-4">Role</th>
                        <th className="text-left text-white/80 font-medium py-4">Department</th>
                        <th className="text-left text-white/80 font-medium py-4">Company</th>
                        <th className="text-left text-white/80 font-medium py-4">Status</th>
                        <th className="text-left text-white/80 font-medium py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user._id} className="border-b border-white/10">
                          <td className="py-4">
                            <div>
                              <p className="text-white font-medium">{user.name}</p>
                              <p className="text-white/60 text-sm">{user.email}</p>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className={`px-3 py-1 rounded-full text-xs ${getRoleColor(user.role)}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="py-4 text-white/80">{user.department}</td>
                          <td className="py-4 text-white/80">{user.company?.name || 'N/A'}</td>
                          <td className="py-4">
                            <span className={`px-3 py-1 rounded-full text-xs ${
                              user.isActive 
                                ? 'text-green-400 bg-green-400/20' 
                                : 'text-red-400 bg-red-400/20'
                            }`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleToggleUserStatus(user._id, user.isActive)}
                                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                title={user.isActive ? 'Deactivate' : 'Activate'}
                              >
                                {user.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setEditingUser(user);
                                  setShowUserModal(true);
                                }}
                                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user._id)}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="mx-auto text-white/30 mb-4" size={48} />
                  <p className="text-white/70">No users found</p>
                  <p className="text-white/50 text-sm">Try adjusting your search criteria</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Companies Tab */}
        {activeTab === 'companies' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Company Management</h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
              </div>
            ) : (
              <div className="space-y-4">
                {companies.map((company) => (
                  <div key={company._id} className="p-4 bg-white/5 rounded-lg">
                    <h4 className="text-white font-medium">{company.name}</h4>
                    <p className="text-white/70 text-sm">Base Currency: {company.baseCurrency}</p>
                    <p className="text-white/70 text-sm">Created: {new Date(company.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <h3 className="text-xl font-semibold text-white mb-4">System Settings</h3>
            <p className="text-white/70">System configuration options will be available here.</p>
          </motion.div>
        )}

        {/* User Modal */}
        <AnimatePresence>
          {showUserModal && (
            <UserModal 
              isOpen={showUserModal}
              onClose={() => {
                setShowUserModal(false);
                setEditingUser(null);
                setSelectedUser(null);
              }}
              user={editingUser}
              roles={['admin', 'manager', 'employee']}
              onSubmit={async (userData) => {
                try {
                  const token = localStorage.getItem('token');
                  const headers = {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  };

                  if (editingUser) {
                    await axios.put(`/api/admin/users/${editingUser._id}`, userData, { headers });
                    toast.success('User updated successfully');
                  } else {
                    await axios.post('/api/admin/users', userData, { headers });
                    toast.success('User created successfully');
                  }
                  
                  setShowUserModal(false);
                  setEditingUser(null);
                  setSelectedUser(null);
                  fetchUsers();
                } catch (error) {
                  console.error('User operation failed:', error);
                  
                  if (error.response?.status === 403) {
                    toast.error('Access denied. Admin privileges required.');
                  } else if (error.response?.status === 409) {
                    toast.error('User with this email already exists');
                  } else {
                    toast.error(error.response?.data?.message || 'Operation failed');
                  }
                }
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// User Modal Component
function UserModal({ isOpen, onClose, onSubmit, user, roles }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'employee',
    department: '',
    password: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'employee',
        department: user.department || '',
        password: ''
      });
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'employee',
        department: '',
        password: ''
      });
    }
  }, [user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="glass-card p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">
            {user ? 'Edit User' : 'Add New User'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {roles.map(role => (
                <option key={role} value={role} className="bg-gray-800">
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Department</label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" className="bg-gray-800">Select Department</option>
              <option value="finance" className="bg-gray-800">Finance</option>
              <option value="hr" className="bg-gray-800">Human Resources</option>
              <option value="it" className="bg-gray-800">IT</option>
              <option value="marketing" className="bg-gray-800">Marketing</option>
              <option value="sales" className="bg-gray-800">Sales</option>
              <option value="operations" className="bg-gray-800">Operations</option>
              <option value="other" className="bg-gray-800">Other</option>
            </select>
          </div>

          {!user && (
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required={!user}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 gradient-button py-3 rounded-lg font-medium"
            >
              {user ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
