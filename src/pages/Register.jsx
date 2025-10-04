import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  UserPlus, 
  Loader,
  Building,
  Shield,
  Users,
  Receipt,
  CheckCircle,
  Settings,
  Camera,
  DollarSign,
  FileText,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Register() {
  const { user, register, loading } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    department: '',
    companyName: '' // Changed from companyCode to companyName for all roles
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roles = [
    {
      id: 'employee',
      name: 'Employee',
      icon: User,
      description: 'Submit expenses, upload receipts with OCR',
      features: [
        'Submit expense claims with multiple currencies',
        'OCR-based receipt upload and scanning',
        'View personal expense history (Approved/Rejected)',
        'Track approval status and comments',
        'Employee dashboard with spending analytics'
      ],
      color: 'bg-blue-500'
    },
    {
      id: 'manager',
      name: 'Manager',
      icon: Users,
      description: 'Approve expenses, manage team and view company data',
      features: [
        'All employee features included',
        'View and approve/reject team expenses',
        'Access to approval workflow dashboard',
        'Add approval comments and feedback',
        'Manage approval workflows and sequences',
        'Team expense analytics and reports',
        'View company-wide expense data',
        'Configure approval rules and policies'
      ],
      color: 'bg-green-500'
    },
    {
      id: 'admin',
      name: 'Admin',
      icon: Shield,
      description: 'Full system access and company management',
      features: [
        'All manager features included',
        'Complete expense management dashboard',
        'User and role management',
        'Configure approval workflows and sequences',
        'Set conditional approval rules (percentage, specific approver, hybrid)',
        'Company-wide analytics and reporting',
        'System settings and configurations',
        'Manage approval rules and policies'
      ],
      color: 'bg-purple-500'
    }
  ];

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRoleSelect = (roleId) => {
    setFormData({
      ...formData,
      role: roleId
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return; // Prevent multiple submissions

    if (!formData.role) {
      toast.error('Please select a role');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (!formData.companyName) {
      toast.error('Company name is required');
      return;
    }

    // Create clean data object for registration
    const registrationData = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      department: formData.department,
      companyName: formData.companyName,
      isFirstUser: true
    };

    setIsSubmitting(true);

    const result = await register(registrationData);

    if (result.success) {
      const roleMessages = {
        admin: 'Admin account created! You have full system access.',
        manager: 'Manager account created! You can now manage team expenses.',
        employee: 'Employee account created! You can start submitting expenses.'
      };
      toast.success(roleMessages[formData.role]);
      navigate('/dashboard');
    } else {
      if (result.message?.includes('Too many')) {
        toast.error('Too many registration attempts. Please wait a moment before trying again.');
      } else if (result.message?.includes('wait') && result.message?.includes('seconds')) {
        toast.error(result.message);
      } else {
        toast.error(result.message);
      }
    }
    
    setIsSubmitting(false);
  };

  const renderRoleSelection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <h2 className="text-xl font-semibold text-white mb-6">Select Your Role</h2>
      
      <div className="space-y-3">
        {roles.map((role) => {
          const IconComponent = role.icon;
          return (
            <motion.div
              key={role.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleRoleSelect(role.id)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                formData.role === role.id
                  ? 'border-blue-400 bg-blue-500/20'
                  : 'border-white/20 bg-white/5 hover:border-white/30'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${role.color}`}>
                  <IconComponent className="text-white" size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium">{role.name}</h3>
                  <p className="text-white/70 text-sm mt-1">{role.description}</p>
                  
                  {formData.role === role.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 space-y-2"
                    >
                      <h4 className="text-white/90 text-sm font-medium">Features & Access:</h4>
                      <ul className="space-y-1">
                        {role.features.map((feature, index) => (
                          <li key={index} className="flex items-start space-x-2 text-white/60 text-xs">
                            <CheckCircle size={12} className="text-green-400 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );

  const renderAccountDetails = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center space-x-2 mb-6">
        <button
          type="button"
          onClick={() => setFormData({ ...formData, role: '' })}
          className="text-white/60 hover:text-white"
        >
          ←
        </button>
        <h2 className="text-xl font-semibold text-white">Account Details</h2>
      </div>
      
      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">
          Full Name
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={18} />
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your full name"
          />
        </div>
      </div>

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={18} />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your email"
          />
        </div>
      </div>

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">
          Company Name
        </label>
        <div className="relative">
          <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={18} />
          <input
            type="text"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            required
            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your company name"
          />
        </div>
        <p className="text-white/50 text-xs mt-1">
          {formData.role === 'admin' 
            ? 'This will create a new company'
            : 'Enter your company name to join or create'
          }
        </p>
      </div>

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">
          Department
        </label>
        <div className="relative">
          <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={18} />
          <select
            name="department"
            value={formData.department}
            onChange={handleChange}
            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="" className="bg-gray-800">Select Department</option>
            <option value="finance" className="bg-gray-800">Finance</option>
            <option value="hr" className="bg-gray-800">Human Resources</option>
            <option value="it" className="bg-gray-800">IT</option>
            <option value="marketing" className="bg-gray-800">Marketing</option>
            <option value="sales" className="bg-gray-800">Sales</option>
            <option value="operations" className="bg-gray-800">Operations</option>
            <option value="other" className="bg-gray-800">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={18} />
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">
          Confirm Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" size={18} />
          <input
            type={showPassword ? 'text' : 'password'}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Confirm your password"
          />
        </div>
      </div>

      <motion.button
        type="submit"
        disabled={loading || isSubmitting}
        whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
        whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
        className="w-full gradient-button py-3 rounded-lg font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading || isSubmitting ? (
          <Loader className="animate-spin" size={18} />
        ) : (
          <>
            <UserPlus size={18} />
            <span>Create Account</span>
          </>
        )}
      </motion.button>
    </motion.div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8"
        >
          <div className="text-center mb-8">
            <h1 className="headline text-3xl text-white mb-2">Join ApproveIt</h1>
            <p className="text-white/70">Choose your role to get started</p>
          </div>

          <form onSubmit={handleSubmit}>
            {!formData.role ? renderRoleSelection() : renderAccountDetails()}
          </form>

          <div className="mt-6 text-center">
            <p className="text-white/70 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-300 hover:text-blue-200 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
