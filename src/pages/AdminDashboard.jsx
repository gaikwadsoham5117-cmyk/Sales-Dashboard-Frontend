import React, { useState, useEffect } from 'react';
import { getAllUsersApi } from '../api/adminApi';
import UserList from '../components/admin/UserList';
import { RefreshCw } from 'lucide-react';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllUsersApi();
      setUsers(data || []);
    } catch (err) {
      setError('Failed to load user directory. Please ensure system server is connected.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Admin Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl lg:text-2xl font-extrabold text-white tracking-tight">
              Administrator Control Portal
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Admin Access Only
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Register new users, review account profiles, and inspect access permissions
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400 font-medium">Loading User Accounts Directory...</p>
        </div>
      ) : (
        <UserList users={users} refreshUsers={fetchUsers} />
      )}
    </div>
  );
}
