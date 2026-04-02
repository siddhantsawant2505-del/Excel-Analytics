import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'; // Added Outlet
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  BarChart3,
  Upload,
  Settings,
  LogOut,
  User,
  Home,
  Shield,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true); // Sidebar open by default

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Upload File', href: '/upload', icon: Upload },
    ...(isAdmin ? [{ name: 'Admin Panel', href: '/admin', icon: Shield }] : [])
  ];

  const sidebarVariants = {
    open: {
      x: 0,
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    },
    closed: {
      x: '-100%',
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    }
  };

  const getPageTitle = () => {
    if (location.pathname === '/dashboard') return 'Dashboard';
    if (location.pathname === '/upload') return 'Upload File';
    if (location.pathname === '/admin') return 'Admin Panel';
    if (location.pathname.startsWith('/analytics')) return 'Analytics';
    return 'Page';
  };

  return (
    // Root container: full viewport height, no fixed width to avoid horizontal overflow
    <div className="min-h-screen overflow-hidden bg-gray-50 m-0 p-0 box-border">
      {/* Mobile overlay when sidebar is open on small screens */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Wrapper flex container for sidebar and main content on large screens */}
      <div className="lg:flex lg:h-screen overflow-hidden">
        {/* Sidebar */}
        <motion.div
          variants={sidebarVariants}
          animate={sidebarOpen ? 'open' : 'closed'}
          className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl
                     lg:static lg:translate-x-0 lg:z-auto lg:flex-shrink-0"
        >
          <div className="flex h-full flex-col">
            {/* Logo and close button */}
            <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 box-border">
              <Link to="/dashboard" className="flex items-center gap-2">
                <BarChart3 className="w-8 h-8 text-primary-600" />
                <span className="text-xl font-bold gradient-text">ExcelAnalytics</span>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 rounded-md hover:bg-gray-100"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto min-w-0 box-border">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(true)}
                    className={clsx(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 box-border',
                      isActive
                        ? 'bg-primary-100 text-primary-700 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* User Section */}
            <div className="border-t border-gray-200 p-4 box-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors duration-200 box-border"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main content area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Topbar */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 flex-shrink-0 box-border">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Hamburger menu: always visible and toggles sidebar */}
                {/* <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-md hover:bg-gray-100"
                  aria-label="Toggle sidebar"
                >
                  <Menu className="w-5 h-5" />
                </button> */}

                <h1 className="text-xl font-semibold text-gray-800">
                  <span className="gradient-text">{getPageTitle()}</span>
                </h1>
              </div>

              <div className="flex items-center gap-4">
                {user?.name && (
                  <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                    {user.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Content container: flex grow + scroll, renders nested child routes */}
          <div className="flex flex-col flex-grow min-h-0 overflow-hidden">
            <main className="flex-1 p-0 m-0 overflow-auto min-h-0 box-border">
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="h-full px-4 sm:px-6 lg:px-8 py-4 box-border"
              >
                <Outlet />
              </motion.div>
            </main>

            {/* OPTIONAL: Bottom quick actions or footer can go here */}
            {/* <div className="px-4 sm:px-6 lg:px-8 py-4 border-t border-gray-200 box-border flex-shrink-0">
              Quick Actions or Footer content
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
