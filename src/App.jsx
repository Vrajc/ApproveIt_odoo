import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CurrencyProvider } from './contexts/CurrencyContext';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ExpenseSubmission from './pages/ExpenseSubmission';
import ApprovalWorkflow from './pages/ApprovalWorkflow';
import TestLogin from './pages/TestLogin';
import ExpenseHistory from './pages/ExpenseHistory';
import Admin from './pages/Admin';

// Components
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';

import './App.css'

// Protected Route Component
function ProtectedRoute({ children, roles = [] }) {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  
  if (!user) return <Navigate to="/login" replace />;
  
  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

// Main App Layout
function AppLayout({ children }) {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-500">
      {user && <Navbar />}
      <main className={user ? 'pt-20' : ''}>
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <div className="App">
          <AppLayout>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/test-login" element={<TestLogin />} />
              
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/submit-expense" 
                element={
                  <ProtectedRoute roles={['employee', 'manager']}>
                    <ExpenseSubmission />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/expense-history" 
                element={
                  <ProtectedRoute roles={['employee', 'manager']}>
                    <ExpenseHistory />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/approvals" 
                element={
                  <ProtectedRoute roles={['manager', 'admin']}>
                    <ApprovalWorkflow />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute roles={['admin']}>
                    <Admin />
                  </ProtectedRoute>
                } 
              />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppLayout>
          <Toaster position="top-right" />
        </div>
      </CurrencyProvider>
    </AuthProvider>
  );
}

export default App

