import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import {
  PlusCircle,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  Receipt,
  AlertCircle,
  Shield,
  Settings,
  History
} from 'lucide-react';
import axios from 'axios';
import { fetchDashboardStats } from '../utils/apiHelpers';

export default function Dashboard() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [stats, setStats] = useState({
    totalExpenses: 0,
    pendingExpenses: 0,
    approvedExpenses: 0,
    rejectedExpenses: 0,
    pendingApprovals: 0,
    teamExpenses: 0
  });
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Replace the fetchDashboardStatsWithFallback function
  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching dashboard data for user:', user?.role, user?.department);

      // Use the new utility function
      const statsData = await fetchDashboardStats(user);

      // Fetch recent expenses
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      let recentExpensesData = [];
      try {
        const endpoints = [
          '/api/expenses/recent',
          '/api/expenses?limit=5&sort=-createdAt'
        ];

        for (const endpoint of endpoints) {
          try {
            const response = await axios.get(endpoint, { headers });
            let expenses = Array.isArray(response.data) ? response.data : 
                          response.data.expenses || response.data.data || [];
            
            // For managers, include team expenses in recent view
            if (user?.role === 'manager' && expenses.length < 3) {
              try {
                const teamResponse = await axios.get(`/api/expenses?limit=5&department=${user.department}`, { headers });
                const teamExpenses = Array.isArray(teamResponse.data) ? teamResponse.data : 
                                   teamResponse.data.expenses || [];
                expenses = [...expenses, ...teamExpenses].slice(0, 5);
              } catch (teamError) {
                console.log('Could not fetch team expenses:', teamError.message);
              }
            }
            
            recentExpensesData = expenses.slice(0, 5);
            break;
          } catch (error) {
            if (error.response?.status !== 404) {
              console.error(`Recent expenses endpoint ${endpoint} error:`, error.message);
            }
          }
        }
      } catch (error) {
        console.error('Recent expenses fetch error:', error);
        recentExpensesData = [];
      }
      
      console.log('Dashboard data fetched:', {
        stats: statsData,
        recentExpenses: recentExpensesData
      });
      
      setStats(statsData);
      setRecentExpenses(recentExpensesData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError(error.message);
      
      // Set default values on error
      setStats({
        totalExpenses: 0,
        pendingExpenses: 0,
        approvedExpenses: 0,
        rejectedExpenses: 0,
        pendingApprovals: 0,
        teamExpenses: 0
      });
      setRecentExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [user]); // Only depend on user

  // Only run effect when user changes or on mount
  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user?.id, fetchDashboardData]); // Use user.id to prevent unnecessary re-renders

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'approved': return 'text-green-400 bg-green-400/20';
      case 'rejected': return 'text-red-400 bg-red-400/20';
      case 'pending': return 'text-yellow-400 bg-yellow-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  }, []);

  const quickActions = useMemo(() => {
    if (!user) return [];
    
    const actions = [];
    
    // Employee and Manager can submit expenses
    if (['employee', 'manager'].includes(user.role)) {
      actions.push({
        title: 'Submit Expense',
        description: 'Create a new expense report',
        icon: PlusCircle,
        href: '/submit-expense',
        color: 'from-blue-500 to-purple-600'
      });

      actions.push({
        title: 'Expense History',
        description: 'View all your submitted expenses',
        icon: History,
        href: '/expense-history',
        color: 'from-indigo-500 to-purple-600'
      });
    }
    
    // Manager and Admin can review approvals
    if (['manager', 'admin'].includes(user.role)) {
      actions.push({
        title: 'Review Approvals',
        description: `${stats.pendingApprovals} pending approvals`,
        icon: CheckCircle,
        href: '/approvals',
        color: 'from-green-500 to-teal-600'
      });
    }
    
    // Manager can view team expenses
    if (user.role === 'manager') {
      actions.push({
        title: 'Team Expenses',
        description: `View and manage team expenses`,
        icon: Users,
        href: '/team-expenses',
        color: 'from-orange-500 to-red-600'
      });
    }
    
    // Admin can access admin panel
    if (user.role === 'admin') {
      actions.push({
        title: 'Admin Panel',
        description: 'Manage users and settings',
        icon: Shield,
        href: '/admin',
        color: 'from-purple-500 to-pink-600'
      },
      {
        title: 'Company Settings',
        description: 'Configure approval rules',
        icon: Settings,
        href: '/admin?tab=settings',
        color: 'from-indigo-500 to-blue-600'
      });
    }

    return actions;
  }, [user, stats.pendingApprovals]); // Only recalculate when user or pending approvals change

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
          <h2 className="text-white text-xl mb-2">Error Loading Dashboard</h2>
          <p className="text-white/70 mb-4">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="gradient-button px-6 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="headline text-4xl text-white mb-2">
            {getGreeting()}, {user?.name}! 
            <span className={`ml-3 px-3 py-1 rounded-full text-sm font-medium ${
              user?.role === 'admin' ? 'bg-purple-500/20 text-purple-300' :
              user?.role === 'manager' ? 'bg-blue-500/20 text-blue-300' :
              'bg-green-500/20 text-green-300'
            }`}>
              {user?.role}
            </span>
          </h1>
          <p className="text-white/70 text-lg">
            Here's what's happening with your expenses today
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Total Expenses</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats.totalExpenses, user?.company?.baseCurrency || 'USD')}
                </p>
                <p className="text-white/50 text-xs mt-1">
                  In {user?.company?.baseCurrency || 'USD'}
                </p>
              </div>
              <Receipt className="text-blue-400" size={24} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Pending</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.pendingExpenses}</p>
              </div>
              <Clock className="text-yellow-400" size={24} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Approved</p>
                <p className="text-2xl font-bold text-green-400">{stats.approvedExpenses}</p>
              </div>
              <CheckCircle className="text-green-400" size={24} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Rejected</p>
                <p className="text-2xl font-bold text-red-400">{stats.rejectedExpenses}</p>
              </div>
              <XCircle className="text-red-400" size={24} />
            </div>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-1"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
            <div className="space-y-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.title}
                    to={action.href}
                    className="block"
                  >
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className={`glass-card p-6 hover:bg-white/15 transition-all duration-300 bg-gradient-to-r ${action.color} bg-opacity-10`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center`}>
                          <Icon className="text-white" size={24} />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">{action.title}</h3>
                          <p className="text-white/70 text-sm">{action.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </motion.div>

          {/* Recent Expenses */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:col-span-2"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Recent Expenses</h2>
            <div className="glass-card p-6">
              {recentExpenses.length > 0 ? (
                <div className="space-y-4">
                  {recentExpenses.map((expense) => (
                    <div key={expense._id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <Receipt className="text-white" size={18} />
                        </div>
                        <div>
                          <h4 className="text-white font-medium">{expense.description}</h4>
                          <p className="text-white/70 text-sm">
                            {expense.category} • {new Date(expense.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">
                          {expense.originalCurrency ? 
                            `${formatCurrency(expense.amount, expense.originalCurrency)}` :
                            formatCurrency(expense.amount, expense.currency)
                          }
                        </p>
                        {expense.convertedAmount && expense.baseCurrency && 
                         expense.originalCurrency !== expense.baseCurrency && (
                          <p className="text-white/70 text-xs">
                            ≈ {formatCurrency(expense.convertedAmount, expense.baseCurrency)}
                          </p>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(expense.status)}`}>
                          {expense.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Receipt className="mx-auto text-white/30 mb-4" size={48} />
                  <p className="text-white/70">No expenses yet</p>
                  <p className="text-white/50 text-sm">Submit your first expense to get started</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
                