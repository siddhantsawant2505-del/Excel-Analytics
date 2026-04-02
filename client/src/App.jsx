import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AdminDashboard from './pages/AdminDashboard';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import ViewReports from './pages/ViewReport';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Replace with your actual Google OAuth client ID!
const GOOGLE_CLIENT_ID = '1046944268854-e4ubv6qc81vengcqoqraldf4il58fvm1.apps.googleusercontent.com';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
          <Route path="/auth" element={user ? <Navigate to="/dashboard" /> : <AuthPage />} />

          {/* Protected routes with shared Layout wrapper */}
          <Route element={user ? <Layout /> : <Navigate to="/auth" />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/analytics/:id" element={<AnalyticsPage />} />
            <Route path="/reports" element={<ViewReports />} />

            {/* Admin route nested inside Layout with role protection */}
            <Route
              path="/admin"
              element={
                user?.role === 'admin' ? (
                  <AdminDashboard />
                ) : (
                  <Navigate to="/dashboard" />
                )
              }
            />
          </Route>

          {/* Catch all route - redirect to homepage or some safe page */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;
