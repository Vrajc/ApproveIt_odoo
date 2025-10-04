import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MessageSquare,
  User,
  Calendar,
  Receipt,
  Tag,
  DollarSign,
  Filter,
  Search
} from 'lucide-react';
import { fetchExpensesWithFallback, handleExpenseApproval } from '../utils/apiHelpers';

export default function ApprovalWorkflow() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchExpenses();
  }, [filter]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check user permissions first
      if (!['admin', 'manager'].includes(user?.role)) {
        setError('Access denied. You do not have permission to view approvals.');
        return;
      }

      console.log('Fetching expenses with filter:', filter, 'User role:', user?.role, 'User dept:', user?.department);

      const expensesData = await fetchExpensesWithFallback(user, filter);
      
      console.log('Fetched expenses data:', expensesData);
      setExpenses(expensesData);
      
      // Show helpful message if no data found
      if (expensesData.length === 0) {
        if (user?.role === 'manager') {
          setError(`No ${filter} expenses found for your department (${user.department}). This might mean:\n• No expenses are pending your approval\n• All expenses have been processed\n• There may be a backend configuration issue`);
        } else {
          setError(`No ${filter} expenses found. This might mean:\n• No expenses need approval\n• All expenses have been processed\n• There may be a backend configuration issue`);
        }
      }
      
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
      setError('Failed to load expenses. Please check your connection and try again.');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (expenseId, action) => {
    if (!['admin', 'manager'].includes(user?.role)) {
      toast.error('You do not have permission to approve expenses.');
      return;
    }

    setActionLoading(true);
    try {
      const result = await handleExpenseApproval(expenseId, action, comment, user);
      
      if (result.success) {
        toast.success(`Expense ${action} successfully`);
        setSelectedExpense(null);
        setComment('');
        await fetchExpenses(); // Refresh the list
      } else {
        throw new Error(result.message || `Failed to ${action} expense`);
      }
    } catch (error) {
      console.error('Approval error:', error);
      toast.error(error.message);
    } finally {
      setActionLoading(false);
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
    expense.submittedBy?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show access denied for non-managers/admins
  if (!['admin', 'manager'].includes(user?.role)) {
    return (
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-white/70">You do not have permission to access the approval workflow.</p>
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
          <h1 className="headline text-4xl text-white mb-2">Expense Approvals</h1>
          <p className="text-white/70">Review and approve expense submissions</p>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 mb-8"
        >
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4">
              {['pending', 'approved', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filter === status
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search expenses..."
                className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </motion.div>

        {/* Expenses List */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              {loading ? (
                <div className="glass-card p-8 text-center">
                  <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white/70">Loading expenses for {user?.role}...</p>
                </div>
              ) : error ? (
                <div className="glass-card p-8 text-center">
                  <div className="text-red-400 mb-4">⚠️</div>
                  <h3 className="text-white font-medium mb-2">Unable to Load Expenses</h3>
                  <p className="text-white/70 text-sm whitespace-pre-line">{error}</p>
                  <button
                    onClick={fetchExpenses}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredExpenses.length > 0 ? (
                <>
                  {/* Show role-specific info */}
                  {user?.role === 'manager' && (
                    <div className="glass-card p-4 mb-4 bg-blue-500/10 border border-blue-500/20">
                      <p className="text-blue-200 text-sm">
                        <strong>Manager View:</strong> Showing expenses for your department ({user.department}) and expenses pending your approval.
                      </p>
                    </div>
                  )}
                  
                  {filteredExpenses.map((expense) => (
                    <motion.div
                      key={expense._id}
                      layoutId={expense._id}
                      onClick={() => setSelectedExpense(expense)}
                      className={`glass-card p-6 cursor-pointer transition-all hover:bg-white/15 ${
                        selectedExpense?._id === expense._id ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Receipt className="text-white" size={18} />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold">{expense.description}</h3>
                            <p className="text-white/70 text-sm flex items-center space-x-2">
                              <User size={14} />
                              <span>{expense.submittedBy?.name || 'Unknown User'}</span>
                              {expense.submittedBy?.department && (
                                <>
                                  <span>•</span>
                                  <span>{expense.submittedBy.department}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(expense.status)}`}>
                            {expense.status}
                          </span>
                          {user?.role === 'manager' && expense.currentApprover === user._id && (
                            <p className="text-green-300 text-xs mt-1">Pending Your Approval</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center space-x-2 text-white/70">
                          <DollarSign size={14} />
                          <span>
                            {expense.originalCurrency ? 
                              formatCurrency(expense.amount, expense.originalCurrency) :
                              formatCurrency(expense.amount, expense.currency)
                            }
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-white/70">
                          <Tag size={14} />
                          <span>{expense.category}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-white/70">
                          <Calendar size={14} />
                          <span>{new Date(expense.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-white/70">
                          <Clock size={14} />
                          <span>{new Date(expense.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {expense.convertedAmount && expense.baseCurrency && 
                       expense.originalCurrency !== expense.baseCurrency && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-white/60 text-xs">
                            Company Currency: {formatCurrency(expense.convertedAmount, expense.baseCurrency)}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </>
              ) : (
                <div className="glass-card p-12 text-center">
                  <Receipt className="mx-auto text-white/30 mb-4" size={48} />
                  <p className="text-white/70">No {filter} expenses found</p>
                  {user?.role === 'manager' ? (
                    <p className="text-white/50 text-sm mt-2">
                      No expenses are currently pending your approval or in your department.
                    </p>
                  ) : (
                    <p className="text-white/50 text-sm mt-2">Try adjusting your filters</p>
                  )}
                </div>
              )}
            </motion.div>
          </div>

          {/* Expense Details */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <AnimatePresence mode="wait">
                {selectedExpense ? (
                  <motion.div
                    key={selectedExpense._id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="glass-card p-6 sticky top-24"
                  >
                    <h2 className="text-xl font-semibold text-white mb-6">Expense Details</h2>

                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="text-white/70 text-sm">Description</label>
                        <p className="text-white">{selectedExpense.description}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-white/70 text-sm">Original Amount</label>
                          <p className="text-white">
                            {formatCurrency(selectedExpense.amount, selectedExpense.originalCurrency || selectedExpense.currency)}
                          </p>
                        </div>
                        <div>
                          <label className="text-white/70 text-sm">Company Currency</label>
                          <p className="text-white">
                            {formatCurrency(selectedExpense.convertedAmount || selectedExpense.amount, selectedExpense.baseCurrency || selectedExpense.originalCurrency)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="text-white/70 text-sm">Category</label>
                        <p className="text-white">{selectedExpense.category}</p>
                      </div>

                      <div>
                        <label className="text-white/70 text-sm">Date</label>
                        <p className="text-white">{new Date(selectedExpense.date).toLocaleDateString()}</p>
                      </div>

                      <div>
                        <label className="text-white/70 text-sm">Submitted By</label>
                        <p className="text-white">{selectedExpense.submittedBy?.name}</p>
                      </div>

                      {selectedExpense.receiptUrl && (
                        <div>
                          <label className="text-white/70 text-sm">Receipt</label>
                          <button
                            onClick={() => window.open(selectedExpense.receiptUrl, '_blank')}
                            className="flex items-center space-x-2 text-blue-300 hover:text-blue-200 transition-colors"
                          >
                            <Eye size={16} />
                            <span>View Receipt</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {selectedExpense.status === 'pending' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-white/80 text-sm font-medium mb-2">
                            Comment (Optional)
                          </label>
                          <div className="relative">
                            <MessageSquare className="absolute left-3 top-3 text-white/50" size={18} />
                            <textarea
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              rows={3}
                              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              placeholder="Add approval comment..."
                            />
                          </div>
                        </div>

                        <div className="flex space-x-3">
                          <motion.button
                            onClick={() => handleApproval(selectedExpense._id, 'approved')}
                            disabled={actionLoading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle size={18} />
                            <span>Approve</span>
                          </motion.button>

                          <motion.button
                            onClick={() => handleApproval(selectedExpense._id, 'rejected')}
                            disabled={actionLoading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                          >
                            <XCircle size={18} />
                            <span>Reject</span>
                          </motion.button>
                        </div>
                      </div>
                    )}

                    {selectedExpense.approvals && selectedExpense.approvals.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-white/20">
                        <h3 className="text-white font-medium mb-3">Approval History</h3>
                        <div className="space-y-2">
                          {selectedExpense.approvals.map((approval, index) => (
                            <div key={index} className="text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-white">{approval.approver?.name}</span>
                                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(approval.status)}`}>
                                  {approval.status}
                                </span>
                              </div>
                              {approval.comment && (
                                <p className="text-white/70 text-xs mt-1">{approval.comment}</p>
                              )}
                              <p className="text-white/50 text-xs">
                                {new Date(approval.date).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card p-8 text-center sticky top-24"
                  >
                    <Eye className="mx-auto text-white/30 mb-4" size={48} />
                    <p className="text-white/70">Select an expense to view details</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
