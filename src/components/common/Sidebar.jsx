import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, Building2, CreditCard,
  Server, BarChart3, UserPlus, LogOut, X,
} from 'lucide-react';

export default function Sidebar({ isOpen = false, onClose }) {
  const { role, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onClose) onClose();
    logout();
    navigate('/login');
  };

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.email || 'User';

  const initials = (user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase();

  const linkClass = ({ isActive }) =>
    `w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium transition-all duration-150 text-left ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 md:static md:z-auto w-[260px] md:w-[220px] flex-shrink-0 flex flex-col h-full transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ backgroundColor: '#172033' }}
      >
        {/* Mobile Header with close button */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <img src="/logo1-removebg-preview.png" alt="Logo" className="h-7 w-7 object-contain" />
            <span className="font-bold text-xs text-white tracking-tight">Tally Analytics</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      {/* Top navigation — scrolls if needed */}
      <div className="flex-1 overflow-y-auto">
        {/* Nav items */}
        <nav className="px-3 pt-4 pb-2 space-y-0.5">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 select-none">
            {role === 'ADMIN' ? 'Administration' : 'Navigation'}
          </p>

          {role === 'ADMIN' && (
            <>
              <NavLink to="/admin" end className={linkClass} onClick={onClose}>
                <LayoutDashboard className="w-[15px] h-[15px] flex-shrink-0" />
                <span>Dashboard</span>
              </NavLink>

              <p className="px-3 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 select-none">
                Management
              </p>

              <NavLink to="/admin/owners" className={linkClass} onClick={onClose}>
                <Users className="w-[15px] h-[15px] flex-shrink-0" />
                <span>Owners</span>
              </NavLink>

              <NavLink to="/admin/organizations" className={linkClass} onClick={onClose}>
                <Building2 className="w-[15px] h-[15px] flex-shrink-0" />
                <span>Organizations</span>
              </NavLink>

              <NavLink to="/admin/subscriptions" className={linkClass} onClick={onClose}>
                <CreditCard className="w-[15px] h-[15px] flex-shrink-0" />
                <span>Subscriptions</span>
              </NavLink>
            </>
          )}

          {role === 'OWNER' && (
            <>
              <NavLink to="/owner" end className={linkClass} onClick={onClose}>
                <LayoutDashboard className="w-[15px] h-[15px] flex-shrink-0" />
                <span>Dashboard</span>
              </NavLink>

              <NavLink to="/owner/sales" className={linkClass} onClick={onClose}>
                <BarChart3 className="w-[15px] h-[15px] flex-shrink-0" />
                <span>Sales Data</span>
              </NavLink>

              <p className="px-3 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 select-none">
                Management
              </p>

              <NavLink to="/owner/employees" className={linkClass} onClick={onClose}>
                <UserPlus className="w-[15px] h-[15px] flex-shrink-0" />
                <span>Employees</span>
              </NavLink>

              <NavLink to="/owner/agent-setup" className={linkClass} onClick={onClose}>
                <Server className="w-[15px] h-[15px] flex-shrink-0" />
                <span>Agent Setup</span>
              </NavLink>
            </>
          )}

          {role === 'EMPLOYEE' && (
            <>
              <NavLink to="/employee" end className={linkClass} onClick={onClose}>
                <LayoutDashboard className="w-[15px] h-[15px] flex-shrink-0" />
                <span>Dashboard</span>
              </NavLink>

              <NavLink to="/employee/sales" className={linkClass} onClick={onClose}>
                <BarChart3 className="w-[15px] h-[15px] flex-shrink-0" />
                <span>Sales Data</span>
              </NavLink>
            </>
          )}
        </nav>
      </div>

      {/* Bottom: user info + logout */}
      <div className="px-3 pb-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {/* User info */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-md mb-1">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-white truncate leading-tight">{displayName}</p>
            <p className="text-[10px] text-slate-500">{role}</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-left"
        >
          <LogOut className="w-[15px] h-[15px] flex-shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
    </>
  );
}
