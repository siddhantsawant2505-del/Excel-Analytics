import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import {
  BarChart3,
  Upload,
  FileSpreadsheet,
  TrendingUp,
  Download,
  Plus,
  Calendar,
  Activity,
  PieChart,
  Eye
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import axios from 'axios';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get('https://excel-analytics-1-4y0b.onrender.com/api/analytics/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Uploads',
      value: stats?.totalUploads || 0,
      icon: FileSpreadsheet,
      color: 'bg-primary-500',
      change: '+12%'
    },
    {
      title: 'Charts Created',
      value: stats?.totalCharts || 0,
      icon: BarChart3,
      color: 'bg-secondary-500',
      change: '+8%'
    },
    {
      title: 'Downloads',
      value: stats?.totalDownloads || 0,
      icon: Download,
      color: 'bg-accent-500',
      change: '+15%'
    },
    {
      title: 'This Month',
      value: stats?.activityData?.length || 0,
      icon: Activity,
      color: 'bg-green-500',
      change: '+23%'
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-full w-full px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-2xl p-8 text-white"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user?.name}! 👋
            </h1>
            <p className="text-primary-100 text-lg">
              Ready to analyze some data today? Upload a new Excel file to get started.
            </p>
          </div>

          <Link
            to="/upload"
            className="mt-4 md:mt-0 btn bg-white text-primary-600 hover:bg-gray-50 btn-md group"
          >
            <Plus className="w-4 h-4 mr-2" />
            Upload File
          </Link>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="card p-6 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-green-600 text-sm font-medium bg-green-100 px-2 py-1 rounded-full">
                  {stat.change}
                </span>
              </div>

              <div>
                <p className="text-gray-600 text-sm mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Uploads */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Uploads</h3>
            <Link to="/reports" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View All
            </Link>
          </div>

          <div className="space-y-4">
            {stats?.recentUploads?.length > 0 ? (
              stats.recentUploads.map((upload) => (
                <div key={upload._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 truncate max-w-xs">
                        {upload.originalName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(upload.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-secondary-100 text-secondary-700 px-2 py-1 rounded-full">
                      {upload.chartConfigs?.length || 0} charts
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No uploads yet</p>
                <Link to="/upload" className="btn btn-primary btn-sm">
                  Upload Your First File
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* Chart Types Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Chart Types</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-3">
            {stats?.chartTypes?.length > 0 ? (
              stats.chartTypes.map((type, index) => {
                const colors = ['bg-primary-500', 'bg-secondary-500', 'bg-accent-500', 'bg-green-500', 'bg-purple-500'];
                const percentage = stats.totalCharts > 0 ? Math.round((type.count / stats.totalCharts) * 100) : 0;

                return (
                  <div key={type._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`}></div>
                      <span className="text-gray-700 capitalize">{type._id || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{type.count}</span>
                      <span className="text-xs text-gray-400">({percentage}%)</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No charts created yet</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions - Reduced width but buttons intact */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="card p-6 min-h-[180px] "
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/upload"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all duration-200 group"
          >
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200">
              <Upload className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Upload New File</p>
              <p className="text-sm text-gray-500">Add Excel data for analysis</p>
            </div>
          </Link>

          <Link
            to="/reports"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all duration-200 group"
          >
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200">
              <TrendingUp className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">View Reports</p>
              <p className="text-sm text-gray-500">Browse your past analyses</p>
            </div>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
