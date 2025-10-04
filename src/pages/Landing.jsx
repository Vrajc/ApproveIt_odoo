import { motion } from 'framer-motion';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  CheckCircle, 
  DollarSign, 
  Users, 
  Zap, 
  ArrowRight,
  Receipt,
  Globe,
  Shield
} from 'lucide-react';

export default function Landing() {
  const { user } = useAuth();

  const features = [
    {
      icon: Receipt,
      title: 'Smart OCR',
      description: 'Auto-extract expense details from receipts using advanced OCR technology'
    },
    {
      icon: Globe,
      title: 'Multi-Currency',
      description: 'Support for 150+ currencies with real-time conversion rates'
    },
    {
      icon: Users,
      title: 'Approval Workflows',
      description: 'Configurable approval chains with role-based permissions'
    },
    {
      icon: Shield,
      title: 'Audit Trail',
      description: 'Complete tracking of all approvals and expense modifications'
    }
  ];

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <h1 className="headline text-6xl md:text-8xl text-white mb-6 animate-float">
              ApproveIt
            </h1>
            <p className="text-xl md:text-2xl text-white/80 text-medium mb-8 max-w-3xl mx-auto">
              Smart expense management with OCR automation, multi-currency support, 
              and intelligent approval workflows
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link
              to="/register"
              className="gradient-button px-8 py-4 text-lg font-medium rounded-xl flex items-center space-x-2 animate-glow"
            >
              <span>Get Started</span>
              <ArrowRight size={20} />
            </Link>
            <Link
              to="/login"
              className="glass-card px-8 py-4 text-lg font-medium rounded-xl text-white hover:bg-white/20 transition-all duration-300"
            >
              Sign In
            </Link>
          </motion.div>
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ 
              y: [0, -20, 0],
              rotate: [0, 5, 0]
            }}
            transition={{ duration: 6, repeat: Infinity }}
            className="absolute top-20 left-10 w-20 h-20 glass-card rounded-full flex items-center justify-center"
          >
            <DollarSign className="text-white" size={30} />
          </motion.div>
          
          <motion.div
            animate={{ 
              y: [0, 20, 0],
              rotate: [0, -5, 0]
            }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-40 right-20 w-16 h-16 glass-card rounded-full flex items-center justify-center"
          >
            <CheckCircle className="text-white" size={24} />
          </motion.div>
          
          <motion.div
            animate={{ 
              y: [0, -15, 0],
              rotate: [0, 3, 0]
            }}
            transition={{ duration: 7, repeat: Infinity }}
            className="absolute bottom-40 left-20 w-24 h-24 glass-card rounded-full flex items-center justify-center"
          >
            <Zap className="text-white" size={32} />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="headline text-4xl md:text-5xl text-white mb-6">
              Why Choose ApproveIt?
            </h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Streamline your expense management with cutting-edge features designed for modern businesses
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  className="glass-card p-6 text-center hover:bg-white/15 transition-all duration-300"
                >
                  <div className="w-16 h-16 gradient-button rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="text-white" size={28} />
                  </div>
                  <h3 className="text-white font-semibold text-xl mb-3">{feature.title}</h3>
                  <p className="text-white/70 text-sm leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto glass-card p-12 text-center"
        >
          <h2 className="headline text-4xl text-white mb-6">
            Ready to Transform Your Expense Management?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Join thousands of companies already using ApproveIt to streamline their expense processes
          </p>
          <Link
            to="/register"
            className="gradient-button px-10 py-4 text-lg font-medium rounded-xl inline-flex items-center space-x-2 animate-glow"
          >
            <span>Start Free Trial</span>
            <ArrowRight size={20} />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
