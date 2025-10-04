import axios from 'axios';

// Helper to get authorization headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Fetch expenses with department filtering for managers
export const fetchExpensesWithFallback = async (user, status = 'pending') => {
  try {
    const headers = getAuthHeaders();
    
    // Build query parameters based on user role
    let queryParams = new URLSearchParams();
    queryParams.append('status', status);
    
    // For managers, add department filtering
    if (user?.role === 'manager' && user?.department) {
      queryParams.append('department', user.department);
    }
    
    const endpoints = [
      `/api/expenses?${queryParams.toString()}`,
      `/api/expenses/approvals?${queryParams.toString()}`,
      `/api/approvals?${queryParams.toString()}`
    ];
    
    console.log('Trying to fetch expenses with params:', queryParams.toString());
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint, { headers });
        
        let expenses = [];
        if (Array.isArray(response.data)) {
          expenses = response.data;
        } else if (response.data.expenses) {
          expenses = response.data.expenses;
        } else if (response.data.data) {
          expenses = response.data.data;
        }
        
        console.log(`Endpoint ${endpoint} returned:`, expenses.length, 'expenses');
        
        // Filter by department on client side if not filtered by backend
        if (user?.role === 'manager' && user?.department) {
          expenses = expenses.filter(expense => {
            // Check if expense belongs to manager's department
            return expense.submittedBy?.department === user.department || 
                   expense.department === user.department ||
                   expense.currentApprover === user._id;
          });
        }
        
        return expenses;
        
      } catch (error) {
        console.log(`Endpoint ${endpoint} failed:`, error.response?.status, error.message);
      }
    }
    
    // If all endpoints fail, return empty array
    console.warn('All expense endpoints failed, returning empty array');
    return [];
    
  } catch (error) {
    console.error('Error in fetchExpensesWithFallback:', error);
    return [];
  }
};

// Handle expense approval/rejection
export const handleExpenseApproval = async (expenseId, action, comment = '', user) => {
  try {
    const headers = getAuthHeaders();
    
    const data = {
      action,
      comment,
      approverId: user._id,
      approverRole: user.role,
      approverDepartment: user.department
    };
    
    const endpoints = [
      `/api/expenses/${expenseId}/approve`,
      `/api/expenses/${expenseId}/status`,
      `/api/approvals/${expenseId}`
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.put(endpoint, data, { headers });
        
        if (response.data.success || response.status === 200) {
          return { success: true, data: response.data };
        }
      } catch (error) {
        console.log(`Approval endpoint ${endpoint} failed:`, error.response?.status);
      }
    }
    
    throw new Error('All approval endpoints failed');
    
  } catch (error) {
    console.error('Error in handleExpenseApproval:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || error.message 
    };
  }
};

// Fetch dashboard stats with department filtering
export const fetchDashboardStats = async (user) => {
  try {
    const headers = getAuthHeaders();
    
    let queryParams = new URLSearchParams();
    
    // For managers, add department filtering
    if (user?.role === 'manager' && user?.department) {
      queryParams.append('department', user.department);
    }
    
    const endpoints = [
      `/api/expenses/stats?${queryParams.toString()}`,
      `/api/dashboard/stats?${queryParams.toString()}`,
      `/api/stats?${queryParams.toString()}`
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint, { headers });
        
        if (response.data && typeof response.data === 'object') {
          let stats = {
            totalExpenses: response.data.totalExpenses || 0,
            pendingExpenses: response.data.pendingExpenses || 0,
            approvedExpenses: response.data.approvedExpenses || 0,
            rejectedExpenses: response.data.rejectedExpenses || 0,
            pendingApprovals: response.data.pendingApprovals || 0,
            teamExpenses: response.data.teamExpenses || 0
          };
          
          // For managers, if pendingApprovals is still 0, manually count
          if (user?.role === 'manager' && stats.pendingApprovals === 0) {
            try {
              const pendingExpenses = await fetchExpensesWithFallback(user, 'pending');
              stats.pendingApprovals = pendingExpenses.length;
            } catch (error) {
              console.log('Could not fetch pending expenses for approval count');
            }
          }
          
          return stats;
        }
      } catch (error) {
        console.log(`Stats endpoint ${endpoint} failed:`, error.message);
      }
    }
    
    // Fallback: calculate stats manually
    if (user?.role === 'manager') {
      try {
        const [pending, approved, rejected] = await Promise.all([
          fetchExpensesWithFallback(user, 'pending'),
          fetchExpensesWithFallback(user, 'approved'), 
          fetchExpensesWithFallback(user, 'rejected')
        ]);
        
        return {
          totalExpenses: pending.length + approved.length + rejected.length,
          pendingExpenses: pending.length,
          approvedExpenses: approved.length,
          rejectedExpenses: rejected.length,
          pendingApprovals: pending.length,
          teamExpenses: pending.length + approved.length + rejected.length
        };
      } catch (error) {
        console.error('Manual stats calculation failed:', error);
      }
    }
    
    // Final fallback
    return {
      totalExpenses: 0,
      pendingExpenses: 0,
      approvedExpenses: 0,
      rejectedExpenses: 0,
      pendingApprovals: 0,
      teamExpenses: 0
    };
    
  } catch (error) {
    console.error('Error in fetchDashboardStats:', error);
    return {
      totalExpenses: 0,
      pendingExpenses: 0,
      approvedExpenses: 0,
      rejectedExpenses: 0,
      pendingApprovals: 0,
      teamExpenses: 0
    };
  }
};
