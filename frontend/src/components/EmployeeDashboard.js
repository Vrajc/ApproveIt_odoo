import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ExpenseForm from './ExpenseForm';
import ExpenseHistory from './ExpenseHistory';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [stats, setStats] = useState({
    totalSubmitted: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    totalAmount: 0
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/expenses/my-expenses', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setExpenses(data);
      calculateStats(data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const calculateStats = (expenseData) => {
    const stats = expenseData.reduce((acc, expense) => {
      acc.totalSubmitted++;
      acc.totalAmount += expense.amount;
      
      switch (expense.status) {
        case 'approved':
          acc.approved++;
          break;
        case 'pending':
        case 'in_review':
          acc.pending++;
          break;
        case 'rejected':
          acc.rejected++;
          break;
      }
      return acc;
    }, { totalSubmitted: 0, approved: 0, pending: 0, rejected: 0, totalAmount: 0 });
    
    setStats(stats);
  };

  return (
    <div className="employee-dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {user?.name}</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          Submit New Expense
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Submitted</h3>
          <span className="stat-number">{stats.totalSubmitted}</span>
        </div>
        <div className="stat-card approved">
          <h3>Approved</h3>
          <span className="stat-number">{stats.approved}</span>
        </div>
        <div className="stat-card pending">
          <h3>Pending</h3>
          <span className="stat-number">{stats.pending}</span>
        </div>
        <div className="stat-card rejected">
          <h3>Rejected</h3>
          <span className="stat-number">{stats.rejected}</span>
        </div>
        <div className="stat-card">
          <h3>Total Amount</h3>
          <span className="stat-number">${stats.totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Expense Form Modal */}
      {showForm && (
        <ExpenseForm 
          onClose={() => setShowForm(false)}
          onSubmit={fetchExpenses}
        />
      )}

      {/* Expense History */}
      <ExpenseHistory expenses={expenses} />
    </div>
  );
};

export default EmployeeDashboard;
