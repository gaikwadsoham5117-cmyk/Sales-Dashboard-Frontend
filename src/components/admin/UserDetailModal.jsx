import React from 'react';
import { X, User, Mail, Phone, MapPin, Calendar, Shield, Hash } from 'lucide-react';

export default function UserDetailModal({ user, onClose }) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="p-5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">User Details Profile</h3>
              <p className="text-xs text-slate-400 font-mono">ID: {user.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Main Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">First Name</p>
              <p className="text-sm font-semibold text-slate-200">{user.firstName || '-'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Last Name</p>
              <p className="text-sm font-semibold text-slate-200">{user.lastName || '-'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Email Address</p>
              <p className="text-xs font-mono text-purple-300">{user.email}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Mobile Number</p>
              <p className="text-xs text-slate-300">{user.mobile || '-'}</p>
            </div>
          </div>

          {/* Address Info */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-purple-400" />
              Address Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500">Address:</span>{' '}
                <span className="text-slate-300">{user.address || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500">Street:</span>{' '}
                <span className="text-slate-300">{user.street || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500">Apartment:</span>{' '}
                <span className="text-slate-300">{user.apartment || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500">City / District:</span>{' '}
                <span className="text-slate-300">
                  {user.city ? `${user.city}, ${user.district || ''}` : '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-500">PIN Code:</span>{' '}
                <span className="text-slate-300 font-mono">{user.pinCode || '-'}</span>
              </div>
            </div>
          </div>

          {/* System metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950/40 p-4 rounded-xl border border-slate-800">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Role</p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-semibold border border-purple-500/20">
                {user.roles || 'USER'}
              </span>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Status</p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                {user.status || 'ACTIVE'}
              </span>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Created On</p>
              <p className="text-slate-300 mt-1 font-mono">
                {user.createdOn ? new Date(user.createdOn).toLocaleString('en-IN') : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
