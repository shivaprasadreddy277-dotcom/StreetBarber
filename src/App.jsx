import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { SettingsProvider } from './context/SettingsContext';
import { NotificationProvider } from './context/NotificationContext';

// Pages
import Home from './pages/Home';
import BookingFunnel from './pages/BookingFunnel';
import Login from './pages/Login';
import StaffDashboard from './pages/StaffDashboard';
import OwnerDashboard from './pages/OwnerDashboard';

// Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-t-orange border-r-transparent border-b-mustard border-l-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // If staff tries to access owner, redirect to staff
    if (role === 'staff') {
      return <Navigate to="/dashboard/staff" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <SettingsProvider>
            <NotificationProvider>
              <div className="min-h-screen bg-cream text-navy flex flex-col justify-between">
                <Routes>
                  {/* Public Pages */}
                  <Route path="/" element={<Home />} />
                  <Route path="/book" element={<BookingFunnel />} />
                  <Route path="/login" element={<Login />} />

                  {/* Staff Dashboard (accessible by staff & owner) */}
                  <Route
                    path="/dashboard/staff"
                    element={
                      <ProtectedRoute allowedRoles={['owner', 'staff']}>
                        <StaffDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Owner Dashboard (owner only) */}
                  <Route
                    path="/dashboard/owner"
                    element={
                      <ProtectedRoute allowedRoles={['owner']}>
                        <OwnerDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </NotificationProvider>
          </SettingsProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
