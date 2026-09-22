import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

// Admin pages
import AdminDashboard from './pages/AdminDashboard';
import SubscriptionManagement from './pages/admin/SubscriptionManagement';
import OrganizationManagement from './pages/admin/OrganizationManagement';
import OwnerManagement from './pages/admin/OwnerManagement';

// Owner pages
import UserDashboard from './pages/UserDashboard';
import EmployeeManagement from './pages/owner/EmployeeManagement';
import AgentSetupPage from './pages/AgentSetupPage';

// ProtectedRoute - checks auth and role
function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard based on actual role
    if (role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (role === 'OWNER') return <Navigate to="/owner" replace />;
    if (role === 'EMPLOYEE') return <Navigate to="/employee" replace />;
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// DashboardLayout - wraps authenticated pages with Navbar + Sidebar
function DashboardLayout() {
  return (
    <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-200">
      <Navbar />
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// RoleRedirect - redirects authenticated users to their dashboard
function RoleRedirect() {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (role === 'OWNER') return <Navigate to="/owner" replace />;
  if (role === 'EMPLOYEE') return <Navigate to="/employee" replace />;

  return <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <RoleRedirect /> : <LoginPage />}
      />
      <Route
        path="/forgot-password"
        element={<ForgotPasswordPage onBackToLogin={() => window.location.href = '/login'} />}
      />

      {/* Admin routes */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/owners" element={<OwnerManagement />} />
          <Route path="/admin/organizations" element={<OrganizationManagement />} />
          <Route path="/admin/subscriptions" element={<SubscriptionManagement />} />
        </Route>
      </Route>

      {/* Owner routes */}
      <Route element={<ProtectedRoute allowedRoles={['OWNER']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/owner" element={<UserDashboard />} />
          <Route path="/owner/sales" element={<UserDashboard />} />
          <Route path="/owner/employees" element={<EmployeeManagement />} />
          <Route path="/owner/agent-setup" element={<AgentSetupPage />} />
        </Route>
      </Route>

      {/* Employee routes */}
      <Route element={<ProtectedRoute allowedRoles={['EMPLOYEE']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/employee" element={<UserDashboard />} />
          <Route path="/employee/sales" element={<UserDashboard />} />
        </Route>
      </Route>

      {/* Catch-all: redirect to role-appropriate dashboard or login */}
      <Route path="*" element={<RoleRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
