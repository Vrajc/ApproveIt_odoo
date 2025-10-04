import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Settings,
  Users,
  Shield,
  Building,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Check,
  AlertCircle,
  UserPlus,
  Crown,
  Lock,
  Unlock,
  Eye,
  EyeOff
} from 'lucide-react';

export default function Admin() {
  const { user } = useAuth();
  const { currencies } = useCurrency();
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(false);
  
  // Company Settings State
  const [companySettings, setCompanySettings] = useState({
    name: '',
    baseCurrency: 'USD',
    approvalRules: {
      sequential: true,
      requireManagerApproval: true,
      thresholds: [],
      conditionalRules: {
        enabled: false,
        percentageRule: {
          enabled: false,
          percentage: 60
        },
        specificApproverRule: {
          enabled: false,
          approverId: null
        },
        hybrid: false
      }
    }
  });
  
  // Users State
  const [users, setUsers] = useState([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    department: '',
    status: 'active'
  });
  
  // Approval Rules State
  const [approvalRules, setApprovalRules] = useState([]);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({
    name: '',
    minAmount: 0,
    maxAmount: 10000,
    categories: [],
    departments: [],
    approvalSteps: [],
    conditionalRule: {
      enabled: false,
      type: 'percentage', // percentage, specific, hybrid
      percentage: 60,
      specificApproverId: null
    }
  });

  const [managers, setManagers] = useState([]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchCompanySettings();
      fetchUsers();
      fetchApprovalRules();
      fetchManagers();
    }
  }, [user]);

  const fetchCompanySettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/company', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCompanySettings(response.data);
    } catch (error) {
      console.error('Failed to fetch company settings:', error);
      toast.error('Failed to load company settings');
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    }
  };

  const fetchApprovalRules = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/approval-rules', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setApprovalRules(response.data);
    } catch (error) {
      console.error('Failed to fetch approval rules:', error);
      toast.error('Failed to load approval rules');
    }
  };

  const fetchManagers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/managers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Ensure we get both admins and managers for approval workflows
      const managersData = Array.isArray(response.data) ? response.data : response.data.managers || [];
      setManagers(managersData);
      
      console.log('Managers fetched:', managersData);
    } catch (error) {
      console.error('Failed to fetch managers:', error);
      toast.error('Failed to load managers data');
      setManagers([]);
    }
  };

  const handleCompanySettingsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/admin/company', companySettings, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('Company settings updated successfully');
    } catch (error) {
      console.error('Failed to update company settings:', error);
      toast.error('Failed to update company settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Enhanced user data with proper role validation
      const userData = {
        ...userForm,
        isManager: userForm.role === 'manager',
        isAdmin: userForm.role === 'admin',
        permissions: {
          canApprove: ['admin', 'manager'].includes(userForm.role),
          canManageUsers: userForm.role === 'admin',
          canViewTeamExpenses: ['admin', 'manager'].includes(userForm.role)
        }
      };
      
      if (editingUser) {
        await axios.put(`/api/admin/users/${editingUser._id}`, userData, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        toast.success('User updated successfully');
      } else {
        await axios.post('/api/admin/users', userData, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        toast.success('User created successfully');
      }
      
      setShowUserForm(false);
      setEditingUser(null);
      setUserForm({
        name: '',
        email: '',
        password: '',
        role: 'employee',
        department: '',
        status: 'active'
      });
      
      // Refresh both users and managers
      await Promise.all([fetchUsers(), fetchManagers()]);
    } catch (error) {
      console.error('Failed to save user:', error);
      toast.error(error.response?.data?.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleUserToggleStatus = async (userId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      
      await axios.put(`/api/admin/users/${userId}/status`, 
        { status: newStatus },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const addApprovalThreshold = () => {
    setCompanySettings(prev => ({
      ...prev,
      approvalRules: {
        ...prev.approvalRules,
        thresholds: [
          ...prev.approvalRules.thresholds,
          { amount: 1000, role: 'manager' }
        ]
      }
    }));
  };

  const removeApprovalThreshold = (index) => {
    setCompanySettings(prev => ({
      ...prev,
      approvalRules: {
        ...prev.approvalRules,
        thresholds: prev.approvalRules.thresholds.filter((_, i) => i !== index)
      }
    }));
  };

  const addApprovalStep = () => {
    setRuleForm(prev => ({
      ...prev,
      approvalSteps: [
        ...prev.approvalSteps,
        {
          sequence: prev.approvalSteps.length + 1,
          role: 'manager',
          isManagerApprover: false,
          required: true
        }
      ]
    }));
  };

  const removeApprovalStep = (index) => {
    setRuleForm(prev => ({
      ...prev,
      approvalSteps: prev.approvalSteps.filter((_, i) => i !== index)
    }));
  };

  // Check if user is admin
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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Crown className="text-white" size={24} />
            </div>
            <div>
              <h1 className="headline text-4xl text-white mb-2">Admin Panel</h1>
              <p className="text-white/70">Manage company settings, users, and approval rules</p>
            </div>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-2 mb-8"
        >
          <div className="flex space-x-2">
            {[
              { id: 'company', label: 'Company Settings', icon: Building },
              { id: 'users', label: 'User Management', icon: Users },
              { id: 'rules', label: 'Approval Rules', icon: Settings }
            ].map((tab) => {
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

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* Company Settings Tab */}
          {activeTab === 'company' && (
            <motion.div
              key="company"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass-card p-8"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Company Settings</h2>
              
              <form onSubmit={handleCompanySettingsSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={companySettings.name}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter company name"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Base Currency
                    </label>
                    <select
                      value={companySettings.baseCurrency}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, baseCurrency: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {currencies.map(currency => (
                        <option key={currency.code} value={currency.code} className="bg-gray-800">
                          {currency.code} - {currency.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Approval Settings */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-white">Approval Settings</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={companySettings.approvalRules.sequential}
                        onChange={(e) => setCompanySettings(prev => ({
                          ...prev,
                          approvalRules: {
                            ...prev.approvalRules,
                            sequential: e.target.checked
                          }
                        }))}
                        className="w-5 h-5 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
                      />
                      <span className="text-white">Sequential Approval</span>
                    </label>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={companySettings.approvalRules.requireManagerApproval}
                        onChange={(e) => setCompanySettings(prev => ({
                          ...prev,
                          approvalRules: {
                            ...prev.approvalRules,
                            requireManagerApproval: e.target.checked
                          }
                        }))}
                        className="w-5 h-5 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
                      />
                      <span className="text-white">Require Manager Approval</span>
                    </label>
                  </div>

                  {/* Approval Thresholds */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-white">Approval Thresholds</h4>
                      <button
                        type="button"
                        onClick={addApprovalThreshold}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        <Plus size={16} />
                        <span>Add Threshold</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {companySettings.approvalRules.thresholds.map((threshold, index) => (
                        <div key={index} className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg">
                          <div className="flex-1">
                            <label className="block text-white/70 text-sm mb-1">Amount</label>
                            <input
                              type="number"
                              value={threshold.amount}
                              onChange={(e) => {
                                const newThresholds = [...companySettings.approvalRules.thresholds];
                                newThresholds[index].amount = parseFloat(e.target.value);
                                setCompanySettings(prev => ({
                                  ...prev,
                                  approvalRules: {
                                    ...prev.approvalRules,
                                    thresholds: newThresholds
                                  }
                                }));
                              }}
                              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-white/70 text-sm mb-1">Required Role</label>
                            <select
                              value={threshold.role}
                              onChange={(e) => {
                                const newThresholds = [...companySettings.approvalRules.thresholds];
                                newThresholds[index].role = e.target.value;
                                setCompanySettings(prev => ({
                                  ...prev,
                                  approvalRules: {
                                    ...prev.approvalRules,
                                    thresholds: newThresholds
                                  }
                                }));
                              }}
                              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                            >
                              <option value="manager" className="bg-gray-800">Manager</option>
                              <option value="admin" className="bg-gray-800">Admin</option>
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeApprovalThreshold(index)}
                            className="p-2 text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Conditional Approval Rules */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-white">Conditional Approval Rules</h4>
                    
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={companySettings.approvalRules.conditionalRules.enabled}
                        onChange={(e) => setCompanySettings(prev => ({
                          ...prev,
                          approvalRules: {
                            ...prev.approvalRules,
                            conditionalRules: {
                              ...prev.approvalRules.conditionalRules,
                              enabled: e.target.checked
                            }
                          }
                        }))}
                        className="w-5 h-5 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
                      />
                      <span className="text-white">Enable Conditional Rules</span>
                    </label>

                    {companySettings.approvalRules.conditionalRules.enabled && (
                      <div className="space-y-4 pl-8">
                        {/* Percentage Rule */}
                        <div className="space-y-2">
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={companySettings.approvalRules.conditionalRules.percentageRule.enabled}
                              onChange={(e) => setCompanySettings(prev => ({
                                ...prev,
                                approvalRules: {
                                  ...prev.approvalRules,
                                  conditionalRules: {
                                    ...prev.approvalRules.conditionalRules,
                                    percentageRule: {
                                      ...prev.approvalRules.conditionalRules.percentageRule,
                                      enabled: e.target.checked
                                    }
                                  }
                                }
                              }))}
                              className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
                            />
                            <span className="text-white">Percentage Rule</span>
                          </label>
                          
                          {companySettings.approvalRules.conditionalRules.percentageRule.enabled && (
                            <div className="flex items-center space-x-2 ml-7">
                              <span className="text-white/70">Approve if</span>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={companySettings.approvalRules.conditionalRules.percentageRule.percentage}
                                onChange={(e) => setCompanySettings(prev => ({
                                  ...prev,
                                  approvalRules: {
                                    ...prev.approvalRules,
                                    conditionalRules: {
                                      ...prev.approvalRules.conditionalRules,
                                      percentageRule: {
                                        ...prev.approvalRules.conditionalRules.percentageRule,
                                        percentage: parseInt(e.target.value)
                                      }
                                    }
                                  }
                                }))}
                                className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white"
                              />
                              <span className="text-white/70">% of approvers approve</span>
                            </div>
                          )}
                        </div>

                        {/* Specific Approver Rule */}
                        <div className="space-y-2">
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={companySettings.approvalRules.conditionalRules.specificApproverRule.enabled}
                              onChange={(e) => setCompanySettings(prev => ({
                                ...prev,
                                approvalRules: {
                                  ...prev.approvalRules,
                                  conditionalRules: {
                                    ...prev.approvalRules.conditionalRules,
                                    specificApproverRule: {
                                      ...prev.approvalRules.conditionalRules.specificApproverRule,
                                      enabled: e.target.checked
                                    }
                                  }
                                }
                              }))}
                              className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
                            />
                            <span className="text-white">Specific Approver Rule</span>
                          </label>
                          
                          {companySettings.approvalRules.conditionalRules.specificApproverRule.enabled && (
                            <div className="ml-7">
                              <select
                                value={companySettings.approvalRules.conditionalRules.specificApproverRule.approverId || ''}
                                onChange={(e) => setCompanySettings(prev => ({
                                  ...prev,
                                  approvalRules: {
                                    ...prev.approvalRules,
                                    conditionalRules: {
                                      ...prev.approvalRules.conditionalRules,
                                      specificApproverRule: {
                                        ...prev.approvalRules.conditionalRules.specificApproverRule,
                                        approverId: e.target.value
                                      }
                                    }
                                  }
                                }))}
                                className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                              >
                                <option value="" className="bg-gray-800">Select Specific Approver</option>
                                {managers.map(manager => (
                                  <option key={manager._id} value={manager._id} className="bg-gray-800">
                                    {manager.name} ({manager.role})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        {/* Hybrid Rule */}
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={companySettings.approvalRules.conditionalRules.hybrid}
                            onChange={(e) => setCompanySettings(prev => ({
                              ...prev,
                              approvalRules: {
                                ...prev.approvalRules,
                                conditionalRules: {
                                  ...prev.approvalRules.conditionalRules,
                                  hybrid: e.target.checked
                                }
                              }
                            }))}
                            className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
                          />
                          <span className="text-white">Hybrid Rule (Percentage OR Specific Approver)</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full gradient-button py-3 rounded-lg font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Save Company Settings</span>
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* Users Management Tab */}
          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">User Management</h2>
                  <button
                    onClick={() => {
                      setShowUserForm(true);
                      setEditingUser(null);
                      setUserForm({
                        name: '',
                        email: '',
                        password: '',
                        role: 'employee',
                        department: '',
                        status: 'active'
                      });
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    <UserPlus size={18} />
                    <span>Add User</span>
                  </button>
                </div>

                {/* Users List */}
                <div className="space-y-3">
                  {users.map((user) => (
                    <div key={user._id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          user.role === 'admin' ? 'bg-purple-500' :
                          user.role === 'manager' ? 'bg-blue-500' : 'bg-green-500'
                        }`}>
                          {user.role === 'admin' ? <Crown size={20} className="text-white" /> :
                           user.role === 'manager' ? <Shield size={20} className="text-white" /> :
                           <Users size={20} className="text-white" />}
                        </div>
                        <div>
                          <h4 className="text-white font-medium">{user.name}</h4>
                          <p className="text-white/70 text-sm">{user.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              user.role === 'admin' ? 'bg-purple-500/20 text-purple-300' :
                              user.role === 'manager' ? 'bg-blue-500/20 text-blue-300' :
                              'bg-green-500/20 text-green-300'
                            }`}>
                              {user.role}
                            </span>
                            <span className="text-white/50 text-xs">{user.department}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-xs ${
                          user.status === 'active' 
                            ? 'bg-green-500/20 text-green-300' 
                            : 'bg-red-500/20 text-red-300'
                        }`}>
                          {user.status}
                        </span>
                        
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setUserForm({
                              name: user.name,
                              email: user.email,
                              password: '',
                              role: user.role,
                              department: user.department,
                              status: user.status
                            });
                            setShowUserForm(true);
                          }}
                          className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        
                        <button
                          onClick={() => handleUserToggleStatus(user._id, user.status)}
                          className={`p-2 transition-colors ${
                            user.status === 'active'
                              ? 'text-red-400 hover:text-red-300'
                              : 'text-green-400 hover:text-green-300'
                          }`}
                        >
                          {user.status === 'active' ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Form Modal */}
              <AnimatePresence>
                {showUserForm && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                  >
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="glass-card p-6 max-w-md w-full"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold text-white">
                          {editingUser ? 'Edit User' : 'Add New User'}
                        </h3>
                        <button
                          onClick={() => setShowUserForm(false)}
                          className="text-white/70 hover:text-white transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <form onSubmit={handleUserSubmit} className="space-y-4">
                        <div>
                          <label className="block text-white/80 text-sm font-medium mb-2">Name</label>
                          <input
                            type="text"
                            value={userForm.name}
                            onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                            required
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-white/80 text-sm font-medium mb-2">Email</label>
                          <input
                            type="email"
                            value={userForm.email}
                            onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                            required
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {!editingUser && (
                          <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">Password</label>
                            <input
                              type="password"
                              value={userForm.password}
                              onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                              required={!editingUser}
                              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">Role</label>
                            <select
                              value={userForm.role}
                              onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="employee" className="bg-gray-800">Employee</option>
                              <option value="manager" className="bg-gray-800">Manager</option>
                              <option value="admin" className="bg-gray-800">Admin</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">Department</label>
                            <select
                              value={userForm.department}
                              onChange={(e) => setUserForm(prev => ({ ...prev, department: e.target.value }))}
                              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="" className="bg-gray-800">Select Department</option>
                              <option value="finance" className="bg-gray-800">Finance</option>
                              <option value="hr" className="bg-gray-800">HR</option>
                              <option value="it" className="bg-gray-800">IT</option>
                              <option value="marketing" className="bg-gray-800">Marketing</option>
                              <option value="sales" className="bg-gray-800">Sales</option>
                              <option value="operations" className="bg-gray-800">Operations</option>
                              <option value="other" className="bg-gray-800">Other</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex space-x-3 pt-4">
                          <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                          >
                            {loading ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowUserForm(false)}
                            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Approval Rules Tab */}
          {activeTab === 'rules' && (
            <motion.div
              key="rules"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass-card p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Approval Rules</h2>
                <button
                  onClick={() => {
                    setShowRuleForm(true);
                    setEditingRule(null);
                    setRuleForm({
                      name: '',
                      minAmount: 0,
                      maxAmount: 10000,
                      categories: [],
                      departments: [],
                      approvalSteps: [],
                      conditionalRule: {
                        enabled: false,
                        type: 'percentage',
                        percentage: 60,
                        specificApproverId: null
                      }
                    });
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <Plus size={18} />
                  <span>Add Rule</span>
                </button>
              </div>

              <div className="space-y-4">
                {approvalRules.map((rule) => (
                  <div key={rule._id} className="p-6 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">{rule.name}</h3>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingRule(rule);
                            setRuleForm(rule);
                            setShowRuleForm(true);
                          }}
                          className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button className="p-2 text-red-400 hover:text-red-300 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-white/70">
                      <div>Amount Range: ${rule.minAmount} - ${rule.maxAmount}</div>
                      <div>Steps: {rule.approvalSteps?.length || 0}</div>
                      <div>Categories: {rule.categories?.join(', ') || 'All'}</div>
                      <div>Departments: {rule.departments?.join(', ') || 'All'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
