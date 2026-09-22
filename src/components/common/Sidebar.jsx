import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, Building2, CreditCard,
  Server, BarChart3, UserPlus, LogOut,
} from 'lucide-react';

export default function Sidebar() {
  const { role, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
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
    <aside
      className="w-full md:w-[220px] flex-shrink-0 flex flex-col h-full"
      style={{ backgroundColor: '#172033' }}
    >
      {/* Top navigation — scrolls if needed */}
      <div className="flex-1 overflow-y-auto">
        {/* Nav items */}
        <nav className="px-3 pt-4 pb-2 space-y-0.5">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 select-none">
            {role === 'ADMIN' ? 'Administration' : 'Navigation'}
          </p>

          {role === 'ADMIN' && (
            <>
              <NavLink to="/admin" end className={linkClass}>
                <LayoutDashboard className="w-[15px] h-[15px] flex-shrink-0" />
                <span>Dashboard</span>
              </NavLink>

              <p className="px-3 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 select-none">
                Management
              </p>

              <NavLink to="/admin/owners" className={linkClass}>
                <Users className="w-[15px] h-[15px] flex-shrink-0" />
                <span>Owners</span>
              </NavLink>

              <NavLink to="/admin/organizations" className={linkClass}>
                <Building2 className="w-[15px] h-[15px] flex-shrink-0" />
                <span>Organizations</span>
              </NavLink>

              <NavLink to="/admin/subscriptions" className={linkClass}>
                <CreditCard className="w-[15px] h-[15px] flex-shrink-0" />
                <span>Subscriptions</span>
              </NavLink>
            </>
          )}

          {role === 'OWNER' && (
            <>
              <NavLink to="/owner" end className={linkClass}>
                <LayoutDashboard className="w-[15px] h-[15px] flex-shrink-0" />
                <span>Dashboard</span>
              </NavLink>

              <NavLink to="/owner/sales" className={linkClass}>
                <BarChart3 className="w-[15px] h-[15px] flex-shrink-0" />
                <span>Sales Data</span>
              </NavLink>

              <p className="px-3 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 select-none">
                Management
              </p>

              <NavLink to="/owner/employees" className={linkClass}>
                <UserPlus className="w-[15px] h-[15px] flex-shrink-0" />
                <span>Employees</span>
              </NavLink>

              <NavLink to="/owner/agent-setup" className={linkClass}>
                <Server className="w-[15px] h-[15px] flex-shrink-0" />
                <span>Agent Setup</span>
              </NavLink>
            </>
          )}

          {role === 'EMPLOYEE' && (
            <>
              <NavLink to="/employee" end className={linkClass}>
                <LayoutDashboard className="w-[15px] h-[15px] flex-shrink-0" />
                <span>Dashboard</span>
              </NavLink>

              <NavLink to="/employee/sales" className={linkClass}>
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
  );
}
