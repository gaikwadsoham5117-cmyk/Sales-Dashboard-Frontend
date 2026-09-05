import React, { useState } from 'react';
import { UserPlus, Search, Eye, ShieldCheck, UserCheck, Calendar, MapPin, Phone } from 'lucide-react';
import UserDetailModal from './UserDetailModal';
import RegisterUserModal from './RegisterUserModal';

export default function UserList({ users = [], refreshUsers }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      u.email?.toLowerCase().includes(term) ||
      u.firstName?.toLowerCase().includes(term) ||
      u.lastName?.toLowerCase().includes(term) ||
      u.city?.toLowerCase().includes(term) ||
      u.roles?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-xl">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-100">System Users Directory</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Admin Control Panel
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage user accounts, roles, registration & access controls
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search user name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500/80 w-60"
            />
          </div>

          {/* Register User Button */}
          <button
            onClick={() => setIsRegisterOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register User</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <th className="py-3 px-4">User Name</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Mobile</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4 text-center">Role</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4">Created On</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500 font-medium">
                  No users found in system directory.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white">
                    {u.firstName ? `${u.firstName} ${u.lastName || ''}` : 'User'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono">
                    {u.email}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {u.mobile || '-'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {u.city ? `${u.city}${u.district ? `, ${u.district}` : ''}` : u.address || '-'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold ${
                        u.roles === 'ADMIN'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      }`}
                    >
                      {u.roles || 'USER'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                      {u.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {u.createdOn ? new Date(u.createdOn).toLocaleDateString('en-IN') : '-'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="View user details"
                    >
                      <Eye className="w-4 h-4 text-purple-400" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {/* Register User Modal */}
      {isRegisterOpen && (
        <RegisterUserModal
          onClose={() => setIsRegisterOpen(false)}
          onSuccess={() => {
            setIsRegisterOpen(false);
            if (refreshUsers) refreshUsers();
          }}
        />
      )}
    </div>
  );
}
