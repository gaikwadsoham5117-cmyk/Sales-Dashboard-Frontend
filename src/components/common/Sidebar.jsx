import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Users, UserPlus, ShieldCheck, Server } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';

  return (
    <aside className="w-full md:w-64 bg-slate-900/60 border-r border-slate-800 p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-6">
        {/* Navigation Section */}
        <div>
          <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {isAdmin ? 'Admin Portal Navigation' : 'User Portal Navigation'}
          </p>
          
          <nav className="space-y-1">
            {isAdmin ? (
              /* ADMIN ONLY SEE USER MANAGEMENT */
              <>
                <button
                  onClick={() => setActiveTab('user-management')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                    activeTab === 'user-management'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>User Directory</span>
                </button>

                <button
                  onClick={() => setActiveTab('register-user')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                    activeTab === 'register-user'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register User</span>
                </button>
              </>
            ) : (
              /* USER ONLY SEES SALES DASHBOARD */
              <>
                <button
                  onClick={() => setActiveTab('sales-dashboard')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                    activeTab === 'sales-dashboard'
                      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Sales Dashboard</span>
                </button>

                <button
                  onClick={() => setActiveTab('tally-agent')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                    activeTab === 'tally-agent'
                      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Server className="w-4 h-4" />
                  <span>Tally Agent</span>
                </button>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* System Status info */}
      <div className="pt-4 border-t border-slate-800/80">
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-semibold text-slate-300">
              {isAdmin ? 'User Admin Mode' : 'Tally Live Mode'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            {isAdmin ? 'System Account Administration' : 'Tally Prime API Connector v2.4'}
          </p>
        </div>
      </div>
    </aside>
  );
}
