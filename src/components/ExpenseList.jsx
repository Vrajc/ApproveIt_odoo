import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const ExpenseList = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        setError('User not authenticated');
        return;
      }

      console.log('ExpenseList: Fetching for user:', user.role, user.department);

      // Use the improved API helper
      const { fetchExpensesWithFallback } = await import('../utils/apiHelpers');
      const expensesData = await fetchExpensesWithFallback(user, 'all');
      
      console.log('ExpenseList: Fetched expenses:', expensesData.length);
      setExpenses(expensesData);
      
    } catch (error) {
      console.error('Error fetching expenses:', error);
      
      if (error.message.includes('Access denied')) {
        setError('Access denied. You do not have permission to view these expenses.');
      } else if (error.message.includes('Authentication')) {
        setError('Authentication failed. Please log in again.');
      } else if (error.message.includes('timeout')) {
        setError('Request timeout. Please check your connection.');
      } else if (error.message.includes('Network')) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to load expenses. Please try again.');
      }
      
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (expenseId, status, comments) => {
    if (!['admin', 'manager'].includes(user.role)) {
      toast.error('You do not have permission to approve expenses');
      return;
    }

    try {
      console.log('ExpenseList: Approving expense:', expenseId, status);
      
      const { handleExpenseApproval } = await import('../utils/apiHelpers');
      await handleExpenseApproval(expenseId, status, comments, user);
      
      toast.success(`Expense ${status} successfully`);
      // Refresh expenses
      fetchExpenses();
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error(error.message || 'Failed to update expense status');
    }
  };

  if (loading) return <div className="text-center py-8">Loading expenses...</div>;
  if (error) return <div className="text-red-500 text-center py-8">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Show different headers based on role */}
      {user.role === 'manager' && (
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white">Manager Dashboard - {user.department} Department</h2>
          <p className="text-white/70">Expenses requiring your approval and from your team</p>
        </div>
      )}
      {user.role === 'admin' && (
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white">Admin Dashboard - All Expenses</h2>
          <p className="text-white/70">Complete expense overview across all departments</p>
        </div>
      )}
      {user.role === 'employee' && (
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white">My Expenses</h2>
          <p className="text-white/70">Your submitted expense reports</p>
        </div>
      )}
      
      {expenses.length === 0 ? (
        <div className="text-center py-8 text-white/70">
          No expenses found.
        </div>
      ) : (
        <div className="space-y-4">
          {expenses.map(expense => (
            <div key={expense._id} className="glass-card p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-white font-semibold">{expense.description}</h3>
                  <p className="text-white/70">Amount: ${expense.amount}</p>
                  <p className="text-white/70">Status: {expense.status}</p>
                  {expense.submittedBy && (
                    <p className="text-white/70">Submitted by: {expense.submittedBy.name}</p>
                  )}
                </div>
                
                {/* Show approval buttons for admin and managers */}
                {(['admin', 'manager'].includes(user.role)) && expense.status === 'pending' && (
                  <div className="space-x-2">
                    <button 
                      onClick={() => handleApproval(expense._id, 'approved')}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleApproval(expense._id, 'rejected')}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExpenseList;