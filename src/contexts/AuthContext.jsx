import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext({});

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

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const response = await axios.get('/api/auth/me');
      
      if (response.data.success) {
        setUser(response.data.user);
      } else {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('AuthContext: Attempting login with:', { email });
      
      const response = await axios.post('/api/auth/login', {
        email: email.trim().toLowerCase(),
        password
      });

      console.log('AuthContext: Login response:', response.data);

      if (response.data.success && response.data.token) {
        const { token, user: userData } = response.data;
        
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);

        return {
          success: true,
          user: userData,
          token
        };
      } else {
        console.error('AuthContext: Login failed - no token in response');
        return {
          success: false,
          message: response.data.message || 'Login failed - invalid response'
        };
      }
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        code: error.code
      });
      
      let message = 'Login failed. Please try again.';
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.response?.status === 401) {
        message = 'Invalid email or password';
      } else if (error.response?.status === 404) {
        message = 'Login service not found. Please contact support.';
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        message = 'Cannot connect to server. Please check if the backend is running on port 5000.';
      } else if (error.code === 'ETIMEDOUT') {
        message = 'Request timed out. Please try again.';
      }

      return {
        success: false,
        message
      };
    }
  };

  const register = async (userData) => {
    const maxRetries = 3;
    const baseDelay = 2000; // Increased to 2 seconds
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setLoading(true);
        
        // Ensure email is lowercase and trimmed
        const cleanData = {
          ...userData,
          email: userData.email.trim().toLowerCase(),
          name: userData.name.trim(),
          // Add development flags if applicable
          isTestUser: userData.email === 'test@example.com',
          skipRateLimit: process.env.NODE_ENV === 'development' && userData.email === 'test@example.com'
        };
        
        console.log(`Registration attempt ${attempt + 1}/${maxRetries + 1}:`, {
          email: cleanData.email,
          isTestUser: cleanData.isTestUser,
          skipRateLimit: cleanData.skipRateLimit
        });
        
        const response = await axios.post('/api/auth/register', cleanData);

        console.log('AuthContext: Registration response:', response.data);

        if (response.data.success && response.data.token) {
          const { token, user: newUser } = response.data;
          
          localStorage.setItem('token', token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          setUser(newUser);

          return {
            success: true,
            user: newUser,
            token
          };
        } else {
          return {
            success: false,
            message: response.data.message || 'Registration failed - invalid response'
          };
        }
      } catch (error) {
        console.error(`AuthContext: Registration error (attempt ${attempt + 1}):`, error);
        lastError = error;
        
        if (error.response?.status === 429) {
          const retryAfter = error.response.data?.retryAfter || Math.pow(2, attempt) * 2; // Fallback exponential backoff
          
          if (attempt < maxRetries) {
            const delay = Math.max(baseDelay * Math.pow(2, attempt), retryAfter * 1000);
            console.log(`Rate limited. Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            return {
              success: false,
              message: `Too many registration attempts. Please wait ${retryAfter} seconds and try again.`
            };
          }
        }
        
        // For non-429 errors, don't retry
        break;
      } finally {
        setLoading(false);
      }
    }

    // Handle final error
    let message = 'Registration failed. Please try again.';
    if (lastError?.response?.data?.message) {
      message = lastError.response.data.message;
    } else if (lastError?.response?.data?.errors) {
      message = lastError.response.data.errors[0]?.msg || message;
    } else if (lastError?.response?.status === 404) {
      message = 'Registration service not found. Please contact support.';
    } else if (lastError?.code === 'ERR_NETWORK' || lastError?.code === 'ECONNREFUSED') {
      message = 'Cannot connect to server. Please check if the backend is running on port 5000.';
    }

    return {
      success: false,
      message
    };
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Logged out successfully');
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

