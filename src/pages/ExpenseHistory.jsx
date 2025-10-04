import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import {
  Receipt,
  Calendar,
  Tag,
  DollarSign,
  ArrowLeft,
  Search,
  Filter,
  Eye,
  Download,
  History
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function ExpenseHistory() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchExpenseHistory();
  }, [statusFilter, categoryFilter, dateRange]);

  const fetchExpenseHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Build query parameters
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);
      
      const response = await axios.get(`/api/expenses?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      setExpenses(response.data.expenses || response.data);
    } catch (error) {
      console.error('Failed to fetch expense history:', error);
      toast.error('Failed to load expense history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-400 bg-green-400/20';
      case 'rejected': return 'text-red-400 bg-red-400/20';
      case 'pending': return 'text-yellow-400 bg-yellow-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const filteredExpenses = expenses.filter(expense =>
    expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewReceipt = (receiptUrl) => {
    if (receiptUrl) {
      window.open(receiptUrl, '_blank');
    } else {
      toast.error('No receipt available');
    }
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <History className="text-white" size={24} />
              </div>
              <div>
                <h1 className="headline text-4xl text-white mb-2">Expense History</h1>
                <p className="text-white/70">View and manage all your submitted expenses</p>
              </div>
            </div>
            <Link
              to="/submit-expense"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2"
            >
              <Receipt size={18} />
              <span>New Expense</span>
            </Link>
          </div>
        </motion.div>

        {/* Summary Stats */}
        {!loading && expenses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          >
            <div className="glass-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Total Expenses</p>
                  <p className="text-2xl font-bold text-white">{expenses.length}</p>
                </div>
                <Receipt className="text-blue-400" size={24} />
              </div>
            </div>
            <div className="glass-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Total Amount</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(
                      expenses.reduce((sum, exp) => sum + (exp.convertedAmount || exp.amount), 0),
                      user?.company?.baseCurrency || 'USD'
                    )}
                  </p>
                </div>
                <DollarSign className="text-green-400" size={24} />
              </div>
            </div>
            <div className="glass-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Approved</p>
                  <p className="text-2xl font-bold text-green-400">
                    {expenses.filter(exp => exp.status === 'approved').length}
                  </p>
                </div>
                <div className="w-6 h-6 bg-green-400/20 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                </div>
              </div>
            </div>
            <div className="glass-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Pending</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {expenses.filter(exp => exp.status === 'pending').length}
                  </p>
                </div>
                <div className="w-6 h-6 bg-yellow-400/20 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 mb-8"
        >
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="text-white/70" size={20} />
            <h3 className="text-white font-medium">Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search expenses..."
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em'
              }}
            >
              <option value="all" className="bg-gray-800 text-white">All Status</option>
              <option value="pending" className="bg-gray-800 text-white">Pending</option>
              <option value="approved" className="bg-gray-800 text-white">Approved</option>
              <option value="rejected" className="bg-gray-800 text-white">Rejected</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em'
              }}
            >
              <option value="all" className="bg-gray-800 text-white">All Categories</option>
              <option value="Travel" className="bg-gray-800 text-white">Travel</option>
              <option value="Meals" className="bg-gray-800 text-white">Meals</option>
              <option value="Office Supplies" className="bg-gray-800 text-white">Office Supplies</option>
              <option value="Equipment" className="bg-gray-800 text-white">Equipment</option>
              <option value="Software" className="bg-gray-800 text-white">Software</option>
              <option value="Marketing" className="bg-gray-800 text-white">Marketing</option>
              <option value="Training" className="bg-gray-800 text-white">Training</option>
              <option value="Other" className="bg-gray-800 text-white">Other</option>
            </select>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setCategoryFilter('all');
                setDateRange({ start: '', end: '' });
              }}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white transition-all"
            >
              Clear All
            </button>
          </div>
        </motion.div>

        {/* Expense List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">
              {filteredExpenses.length > 0 ? `${filteredExpenses.length} Expenses` : 'No Expenses'}
            </h3>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/70">Loading expense history...</p>
            </div>
          ) : filteredExpenses.length > 0 ? (
            <div className="space-y-3">
              {filteredExpenses.map((expense, index) => (
                <motion.div
                  key={expense._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-300 border border-white/10"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Receipt className="text-white" size={20} />
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="text-white font-medium text-lg mb-1">{expense.description}</h4>
                      <div className="flex items-center space-x-6 text-sm text-white/70">
                        <div className="flex items-center space-x-1">
                          <Tag size={14} />
                          <span>{expense.category}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar size={14} />
                          <span>{new Date(expense.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-white/50">Submitted:</span>
                          <span>{new Date(expense.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <p className="text-white font-bold text-lg">
                        {formatCurrency(expense.convertedAmount || expense.amount, expense.baseCurrency || expense.currency)}
                      </p>
                      {expense.originalCurrency !== (expense.baseCurrency || expense.currency) && (
                        <p className="text-white/50 text-sm">
                          {formatCurrency(expense.amount, expense.originalCurrency)}
                        </p>
                      )}
                    </div>
                    
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(expense.status)}`}>
                      {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                    </span>
                    
                    {expense.receiptUrl && (
                      <button
                        onClick={() => handleViewReceipt(expense.receiptUrl)}
                        className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        title="View Receipt"
                      >
                        <Eye size={18} />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Receipt className="text-white/50" size={32} />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">No expenses found</h3>
              <p className="text-white/50 mb-6">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' 
                  ? 'Try adjusting your filters to see more results' 
                  : 'You haven\'t submitted any expenses yet'
                }
              </p>
              {(!searchTerm && statusFilter === 'all' && categoryFilter === 'all') && (
                <Link
                  to="/submit-expense"
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300"
                >
                  <Receipt size={18} />
                  <span>Submit Your First Expense</span>
                </Link>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
