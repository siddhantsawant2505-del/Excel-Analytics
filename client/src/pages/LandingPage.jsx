import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Upload, 
  FileSpreadsheet, 
  TrendingUp, 
  Shield, 
  Download,
  ChevronRight,
  Star,
  Users,
  Zap
} from 'lucide-react';

const LandingPage = () => {
  const features = [
    {
      icon: Upload,
      title: 'Easy File Upload',
      description: 'Drag and drop Excel files (.xls, .xlsx) with secure processing and validation.'
    },
    {
      icon: BarChart3,
      title: 'Interactive Charts',
      description: 'Generate beautiful 2D and 3D visualizations using Chart.js and Three.js.'
    },
    {
      icon: TrendingUp,
      title: 'Data Analytics',
      description: 'Get insights from your data with advanced analytics and pattern recognition.'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'JWT-based authentication ensures your data remains safe and private.'
    },
    {
      icon: Download,
      title: 'Export Options',
      description: 'Download your charts as PNG or PDF for reports and presentations.'
    },
    {
      icon: FileSpreadsheet,
      title: 'History Tracking',
      description: 'Keep track of all your uploads and analysis with complete history.'
    }
  ];

  const stats = [
    { icon: Users, value: '1000+', label: 'Active Users' },
    { icon: FileSpreadsheet, value: '10K+', label: 'Files Processed' },
    { icon: BarChart3, value: '50K+', label: 'Charts Generated' },
    { icon: Star, value: '4.9', label: 'User Rating' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-8 h-8 text-primary-600" />
              <span className="text-xl font-bold gradient-text">ExcelAnalytics</span>
            </div>
            
            <div className="flex items-center gap-4">
              <Link 
                to="/auth" 
                className="btn btn-outline btn-md"
              >
                Sign In
              </Link>
              <Link 
                to="/auth" 
                className="btn btn-primary btn-md"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-secondary-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
              Transform Your{' '}
              <span className="gradient-text">Excel Data</span>
              <br />
              Into Beautiful Insights
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Upload Excel files, visualize data with interactive charts, and generate insights 
              with our powerful analytics platform. Fast, secure, and user-friendly.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                to="/auth" 
                className="btn btn-primary btn-lg group"
              >
                Start Analyzing Now
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
              
              <button className="btn btn-outline btn-lg">
                View Demo
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
                  <div className="text-gray-600">{stat.label}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Data Analysis
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform provides all the tools you need to upload, analyze, and visualize 
              your Excel data with professional-grade features.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="card p-8 hover:shadow-lg transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-6">
                    <Icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
              Join thousands of users who trust our platform for their data analysis needs. 
              Start your free account today.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                to="/auth" 
                className="btn bg-white text-primary-600 hover:bg-gray-50 btn-lg group"
              >
                <Zap className="w-5 h-5 mr-2" />
                Start Free Trial
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <BarChart3 className="w-8 h-8 text-primary-400" />
              <span className="text-xl font-bold">ExcelAnalytics</span>
            </div>
            
            <div className="text-gray-400 text-sm">
              © 2025 ExcelAnalytics. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;