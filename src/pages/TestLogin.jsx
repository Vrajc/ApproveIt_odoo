import { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function TestLogin() {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test, success, message, data = null) => {
    setTestResults(prev => [...prev, {
      test,
      success,
      message,
      data,
      timestamp: new Date().toISOString()
    }]);
  };

  const testConnection = async () => {
    setLoading(true);
    setTestResults([]);

    try {
      // Test 1: Basic connection
      try {
        const response = await axios.get('/api/auth/check-db');
        addResult('Database Connection', true, 'Connected successfully', response.data);
      } catch (error) {
        addResult('Database Connection', false, `Failed: ${error.message}`);
      }

      // Test 2: Create test user with rate limit handling
      const testUser = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'employee',
        department: 'IT',
        companyName: 'Test Company',
        isTestUser: true,
        skipRateLimit: true // Always try to skip for test user
      };

      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const response = await axios.post('/api/auth/register', testUser);
        addResult('User Registration', true, 'Test user created successfully');
      } catch (error) {
        if (error.response?.status === 429) {
          addResult('User Registration', false, 'Rate limited - please wait before testing again');
        } else if (error.response?.data?.message?.includes('already exists')) {
          addResult('User Registration', true, 'Test user already exists');
        } else {
          addResult('User Registration', false, `Failed: ${error.response?.data?.message || error.message}`);
        }
      }

      // Test 3: Check if user exists
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        const response = await axios.post('/api/auth/check-user', { email: 'test@example.com' });
        addResult('User Check', response.data.exists, 
          response.data.exists ? 'User found in database' : 'User not found', 
          response.data.user);
      } catch (error) {
        addResult('User Check', false, `Failed: ${error.message}`);
      }

      // Test 4: Test login
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        const response = await axios.post('/api/auth/login', {
          email: 'test@example.com',
          password: 'password123'
        });
        addResult('Login Test', response.data.success, 
          response.data.success ? 'Login successful' : response.data.message,
          response.data.user);
      } catch (error) {
        if (error.response?.status === 429) {
          addResult('Login Test', false, 'Rate limited - please wait before testing login');
        } else {
          addResult('Login Test', false, `Failed: ${error.response?.data?.message || error.message}`);
        }
      }

    } catch (error) {
      addResult('General Error', false, error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    try {
      const response = await axios.post('/api/auth/reset-password', {
        email: 'test@example.com',
        newPassword: 'password123'
      });
      
      if (response.data.success) {
        toast.success('Password reset successfully');
        addResult('Password Reset', true, 'Password reset for test user');
      }
    } catch (error) {
      toast.error('Password reset failed');
      addResult('Password Reset', false, error.response?.data?.message || error.message);
    }
  };

  const clearResults = () => {
    setTestResults([]);
    toast.success('Test results cleared');
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="headline text-4xl text-white mb-2">Login Debug Center</h1>
          <p className="text-white/70">Test authentication and debug login issues</p>
        </motion.div>

        <div className="glass-card p-6 mb-8">
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={testConnection}
              disabled={loading}
              className="gradient-button px-6 py-3 rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? 'Running Tests...' : 'Run All Tests'}
            </button>
            <button
              onClick={resetPassword}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Reset Password
            </button>
            <button
              onClick={clearResults}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Clear Results
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">Test Results:</h3>
            {testResults.length === 0 ? (
              <p className="text-white/70">No tests run yet. Click "Run All Tests" to start.</p>
            ) : (
              testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.success 
                      ? 'border-green-500/30 bg-green-500/10' 
                      : 'border-red-500/30 bg-red-500/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-medium">{result.test}</h4>
                    <span className={`px-2 py-1 rounded text-xs ${
                      result.success ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {result.success ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                  <p className="text-white/80 text-sm mb-2">{result.message}</p>
                  {result.data && (
                    <details className="text-white/60 text-xs">
                      <summary className="cursor-pointer">View Data</summary>
                      <pre className="mt-2 p-2 bg-black/20 rounded overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-white font-semibold text-lg mb-4">Test Information</h3>
          <div className="space-y-3 text-white/80 text-sm">
            <div>
              <p className="font-medium text-white">Test User Credentials:</p>
              <p>Email: test@example.com</p>
              <p>Password: password123</p>
            </div>
            
            <div>
              <p className="font-medium text-white">API Endpoints:</p>
              <p>Backend: http://localhost:5000</p>
              <p>Frontend Proxy: {window.location.origin}/api</p>
            </div>
            
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-yellow-300 font-medium">Rate Limiting Notice:</p>
              <p className="text-yellow-200">If you see 429 errors, wait 1-2 minutes between attempts or use manual registration.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

