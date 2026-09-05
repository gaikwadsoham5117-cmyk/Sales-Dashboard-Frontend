import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LogOut, User, Database, Sun, Moon } from 'lucide-react';

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    // <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 py-3 transition-colors duration-200">
     <header className="sticky top-0 z-40 bg-[#1e293b]/95 dark:bg-[#1e293b]/95 backdrop-blur-md border-b border-slate-700 px-4 lg:px-8 py-3 transition-colors duration-200">
      <div className="flex items-center justify-between">
        {/* Left section: Logo & App Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 p-0.5 shadow-md shadow-indigo-500/10">
            <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Database className="w-5 h-5 text-indigo-600 dark:text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-slate-100 tracking-tight">Tally Analytics</h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-full">
                System Active
              </span>
            </div>
            <p className="text-xs text-slate-400">Enterprise Accounting & User Portal</p>
          </div>
        </div>

        {/* Right section: Theme toggle, User info & Logout */}
        <div className="flex items-center gap-3">
          {/* Dark / Light Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Dark Mode</span>
              </>
            )}
          </button>

          {/* Role badge */}
          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-slate-700/60">
            <div className={`w-2 h-2 rounded-full ${role === 'ADMIN' ? 'bg-purple-500 dark:bg-purple-400 animate-pulse' : 'bg-indigo-600 dark:bg-cyan-400'}`} />
            <span className="text-xs font-bold text-indigo-900 dark:text-slate-200 uppercase tracking-wider">
              {role || 'USER'}
            </span>
          </div>

          {/* User profile details */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/40 rounded-lg text-slate-700 dark:text-slate-300 text-xs border border-slate-200 dark:border-slate-800 font-medium">
            <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="truncate max-w-[140px]">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email || 'Logged User'}
            </span>
          </div>

          {/* Logout button */}
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20 hover:border-rose-300 dark:hover:border-rose-500/40 transition-all cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
