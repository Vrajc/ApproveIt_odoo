import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check user permissions
  const hasRole = (roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const canApprove = () => {
    return hasRole(['manager', 'admin', 'finance', 'director']);
  };

  const isEmployee = () => {
    return hasRole(['employee']);
  };

  const isAdmin = () => {
    return hasRole(['admin']);
  };

  // ...existing auth methods...

  const value = {
    user,
    setUser,
    loading,
    hasRole,
    canApprove,
    isEmployee,
    isAdmin,
    // ...existing methods...
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
