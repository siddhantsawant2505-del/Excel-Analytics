import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  FileSpreadsheet, 
  BarChart3, 
  Activity,
  Shield,
  Ban,
  Trash2,
  MoreVertical
} from 'lucide-react';  // Add MoreVertical icon for menu toggle
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  
  // State to track which users have their action menu open
  const [openActionUserIds, setOpenActionUserIds] = useState({});

  useEffect(() => {
    fetchAdminStats();
    fetchUsers();
  }, []);

  const fetchAdminStats = async () => {
    try {
      const response = await axios.get('https://excel-analytics-1-4y0b.onrender.com/api/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      toast.error('Failed to load admin statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await axios.get('https://excel-analytics-1-4y0b.onrender.com/api/admin/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleBlockUser = async (userId, isBlocked) => {
    try {
      await axios.patch(`https://excel-analytics-1-4y0b.onrender.com/api/admin/users/${userId}/block`, { isBlocked: !isBlocked });
      toast.success(`User ${!isBlocked ? 'blocked' : 'unblocked'} successfully`);
      fetchUsers();
      // Close the menu for this user
      toggleActionsMenu(userId);
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`https://excel-analytics-1-4y0b.onrender.com/api/admin/users/${userId}`);
      toast.success('User deleted successfully');
      fetchUsers();
      fetchAdminStats(); // Refresh stats
      toggleActionsMenu(userId);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  // Toggle showing action menu for a specific user ID
  const toggleActionsMenu = (userId) => {
    setOpenActionUserIds(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading admin dashboard..." />
      </div>
    );
  }

  const totalChartsCount = stats?.chartTypes?.reduce((sum, type) => sum + type.count, 0) || 0;

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.users?.total || 0,
      icon: Users,
      color: 'bg-primary-500',
      change: '+12%',
      subtitle: `${stats?.users?.active || 0} active`
    },
    {
      title: 'Total Uploads',
      value: stats?.uploads?.total || 0,
      icon: FileSpreadsheet,
      color: 'bg-secondary-500',
      change: '+8%',
      subtitle: `${Math.round((stats?.uploads?.totalSize || 0) / (1024 * 1024))} MB total`
    },
    {
      title: 'Charts Created',
      value: totalChartsCount,
      icon: BarChart3,
      color: 'bg-accent-500',
      change: '+15%',
      subtitle: `${stats?.chartTypes?.length || 0} different types`
    },
    {
      title: 'Admin Users',
      value: stats?.users?.admins || 0,
      icon: Shield,
      color: 'bg-purple-500',
      change: '0%',
      subtitle: `${stats?.users?.blocked || 0} blocked users`
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-gradient-to-r from-purple-600 to-primary-600 rounded-2xl p-8 text-white"
      >
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>
        <p className="text-purple-100 text-lg">
          Monitor platform activity, manage users, and view comprehensive analytics.
        </p>
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
                <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.subtitle}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Chart Types Distribution */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Chart Types</h3>
          <BarChart3 className="w-5 h-5 text-gray-400" />
        </div>

        <div className="space-y-3">
          {stats?.chartTypes?.length > 0 ? (
            stats.chartTypes.map((type, index) => {
              const colors = ['bg-primary-500', 'bg-secondary-500', 'bg-accent-500', 'bg-green-500', 'bg-purple-500'];
              const percentage = type.percentage ?? (
                totalChartsCount > 0 ? Math.round((type.count / totalChartsCount) * 100) : 0
              );

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

      {/* User Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
          <span className="text-sm text-gray-500">
            {users.length} total users
          </span>
        </div>

        {usersLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" text="Loading users..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 relative">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploads
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((userData) => (
                  <tr key={userData._id} className="hover:bg-gray-50 relative">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{userData.name}</div>
                          <div className="text-sm text-gray-500">{userData.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        userData.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {userData.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {userData.uploadCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        userData.isBlocked 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {userData.isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {userData.role !== 'admin' ? (
                        <>
                          <button
                            onClick={() => toggleActionsMenu(userData._id)}
                            className="btn btn-sm btn-outline flex items-center justify-center p-1"
                            aria-label="Toggle actions menu"
                            title="Actions"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>

                          {openActionUserIds[userData._id] && (
                            <div
                              className="absolute right-0 mt-2 w-28 bg-white border rounded shadow-md z-10 flex flex-col space-y-1 p-2"
                              role="menu"
                              aria-orientation="vertical"
                              aria-label="User actions"
                            >
                              <button
                                onClick={() => handleBlockUser(userData._id, userData.isBlocked)}
                                className={`btn btn-sm w-full ${
                                  userData.isBlocked
                                    ? 'btn-secondary'
                                    : 'btn-outline text-yellow-600 hover:bg-yellow-50'
                                }`}
                                title={userData.isBlocked ? 'Unblock user' : 'Block user'}
                                role="menuitem"
                              >
                                <Ban className="w-4 h-4 mr-1 inline" />
                                {userData.isBlocked ? 'Unblock' : 'Block'}
                              </button>

                              <button
                                onClick={() => handleDeleteUser(userData._id)}
                                className="btn btn-sm btn-outline text-red-600 hover:bg-red-50 w-full"
                                title="Delete user"
                                role="menuitem"
                              >
                                <Trash2 className="w-4 h-4 mr-1 inline" />
                                Delete
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400 italic">No actions</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
