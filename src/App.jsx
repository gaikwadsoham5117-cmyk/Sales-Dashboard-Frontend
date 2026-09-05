import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import UserDashboard from './pages/UserDashboard';
import AgentSetupPage from './pages/AgentSetupPage';
import AdminDashboard from './pages/AdminDashboard';
import RegisterUserModal from './components/admin/RegisterUserModal';

function MainApp() {
  const { isAuthenticated, role } = useAuth();
  const [authScreen, setAuthScreen] = useState('login'); // 'login' | 'forgot'
  const [activeTab, setActiveTab] = useState(() => (role === 'ADMIN' ? 'user-management' : 'sales-dashboard'));
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  useEffect(() => {
    if (role === 'ADMIN') {
      setActiveTab('user-management');
    } else {
      setActiveTab('sales-dashboard');
    }
  }, [role]);

  // Unauthenticated flow
  if (!isAuthenticated) {
    if (authScreen === 'forgot') {
      return <ForgotPasswordPage onBackToLogin={() => setAuthScreen('login')} />;
    }
    return <LoginPage onNavigateForgotPassword={() => setAuthScreen('forgot')} />;
  }

  // Handle active tab switches
  const handleTabChange = (tab) => {
    if (tab === 'register-user') {
      setIsRegisterOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar Header */}
      <Navbar />

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Sidebar Navigation */}
        <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />

        {/* Main Content Area */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {role === 'ADMIN' ? (
            <AdminDashboard activeTab={activeTab} />
          ) : activeTab === 'tally-agent' ? (
            <AgentSetupPage />
          ) : (
            <UserDashboard />
          )}
        </main>
      </div>

      {/* Global Register User Modal */}
      {isRegisterOpen && (
        <RegisterUserModal
          onClose={() => setIsRegisterOpen(false)}
          onSuccess={() => {
            setIsRegisterOpen(false);
            setActiveTab('user-management');
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
