import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PendingApprovals from './PendingApprovals';
import ExpensesDashboard from './ExpensesDashboard';
import ApprovalRulesManager from './ApprovalRulesManager';

const AdminDashboard = () => {
  const { user, canApprove, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (canApprove()) {
      fetchPendingCount();
    }
  }, []);

  const fetchPendingCount = async () => {
    try {
      const response = await fetch('/api/expenses/pending-approvals', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setPendingCount(data.length);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>{user?.role === 'admin' ? 'Admin' : 'Manager'} Dashboard</h1>
        <div className="user-info">
          <span>{user?.name} - {user?.role}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dashboard-tabs">
        {canApprove() && (
          <button
            className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Approvals {pendingCount > 0 && <span className="badge">{pendingCount}</span>}
          </button>
        )}
        
        <button
          className={`tab ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          All Expenses
        </button>

        {isAdmin() && (
          <button
            className={`tab ${activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            Approval Rules
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'pending' && canApprove() && (
          <PendingApprovals onApprovalAction={fetchPendingCount} />
        )}
        
        {activeTab === 'expenses' && (
          <ExpensesDashboard />
        )}

        {activeTab === 'rules' && isAdmin() && (
          <ApprovalRulesManager />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
