import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserPlus, Pencil, Eye, Users, RefreshCw, X, 
  CheckCircle, AlertCircle, Building2, CreditCard, Search
} from 'lucide-react';
import { getAllUsersApi, getUserByIdApi, updateUserApi } from '../../api/adminApi';
import { registerOwnerApi } from '../../api/ownerApi';
import { getAllOrganizationsApi } from '../../api/organizationApi';
import { getAllSubscriptionsApi } from '../../api/subscriptionApi';

export default function OwnerManagement() {
  const [owners, setOwners] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
  
  // Forms state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    mobile: '',
    address: '',
    organizationId: '',
    status: 'ACTIVE'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [usersRes, orgsRes, subsRes] = await Promise.all([
        getAllUsersApi(),
        getAllOrganizationsApi(),
        getAllSubscriptionsApi()
      ]);

      const usersList = Array.isArray(usersRes?.data) ? usersRes.data : (Array.isArray(usersRes) ? usersRes : []);
      const orgsList = Array.isArray(orgsRes?.data) ? orgsRes.data : (Array.isArray(orgsRes) ? orgsRes : []);
      const subsList = Array.isArray(subsRes?.data) ? subsRes.data : (Array.isArray(subsRes) ? subsRes : []);

      const filteredOwners = usersList.filter(u => u.roles === 'OWNER').map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });

      setOwners(filteredOwners);
      setOrganizations(orgsList);
      setSubscriptions(subsList);
      
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const orgMap = useMemo(() => {
    return organizations.reduce((acc, org) => {
      acc[org.id] = org;
      return acc;
    }, {});
  }, [organizations]);

  const subMap = useMemo(() => {
    return subscriptions.reduce((acc, sub) => {
      acc[sub.id] = sub;
      return acc;
    }, {});
  }, [subscriptions]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      // Do NOT send subscriptionId to the Owner API
      const { email, password, firstName, lastName, mobile, address, organizationId } = formData;
      const createPayload = { email, password, firstName, lastName, mobile, address, organizationId };
      
      await registerOwnerApi(createPayload);
      setSuccess('Owner created successfully');
      setIsCreateModalOpen(false);
      setFormData({
        firstName: '', lastName: '', email: '', password: '', 
        mobile: '', address: '', organizationId: '', status: 'ACTIVE'
      });
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create owner');
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOwner) return;
    
    try {
      setLoading(true);
      setError(null);
      const updatePayload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        mobile: formData.mobile,
        address: formData.address,
        status: formData.status
      };
      
      await updateUserApi(selectedOwner.id, updatePayload);
      setSuccess('Owner updated successfully');
      setIsEditModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update owner');
      setLoading(false);
    }
  };

  const openEditModal = (owner) => {
    setSelectedOwner(owner);
    setFormData({
      firstName: owner.firstName || '',
      lastName: owner.lastName || '',
      email: owner.email || '',
      password: '',
      mobile: owner.mobile || '',
      address: owner.address || '',
      organizationId: owner.organizationId || '',
      status: owner.status || 'ACTIVE'
    });
    setIsEditModalOpen(true);
  };

  // For create form, resolve selected organization's subscription details
  const selectedOrgDetails = formData.organizationId ? orgMap[formData.organizationId] : null;
  const selectedSubDetails = selectedOrgDetails && selectedOrgDetails.subscriptionId ? subMap[selectedOrgDetails.subscriptionId] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Owner Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage system owners and their assigned organizations.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
          <button
            onClick={() => {
              setFormData({ firstName: '', lastName: '', email: '', password: '', mobile: '', address: '', organizationId: '', status: 'ACTIVE' });
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
          >
            <UserPlus className="w-4 h-4" />
            Create Owner
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Contact</th>
                <th className="px-6 py-4 font-semibold">Organization</th>
                <th className="px-6 py-4 font-semibold">Subscription</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Created</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
              {loading && owners.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <p>Loading owners...</p>
                    </div>
                  </td>
                </tr>
              ) : owners.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                    No owners found.
                  </td>
                </tr>
              ) : (
                owners.map(owner => {
                  const org = orgMap[owner.organizationId];
                  const sub = org && org.subscriptionId ? subMap[org.subscriptionId] : null;

                  return (
                    <tr key={owner.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-slate-200">{owner.firstName} {owner.lastName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-slate-300">{owner.email}</div>
                        <div className="text-slate-500 mt-1">{owner.mobile || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {org ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {org.organizationName}
                          </div>
                        ) : (
                          <span className="text-slate-500">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {sub ? (
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                            <span className="px-2 py-0.5 bg-slate-800 rounded-full text-[10px] font-medium border border-slate-700">
                              {sub.planName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase
                          ${owner.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                            owner.status === 'INACTIVE' ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' : 
                            owner.status === 'TRIAL' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 
                            'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}
                        >
                          {owner.status || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400">
                        {new Date(owner.createdAt || owner.createdDate || Date.now()).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => openEditModal(owner)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700 opacity-0 group-hover:opacity-100"
                          title="Edit / View"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => !loading && setIsCreateModalOpen(false)}></div>
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                Register New Owner
              </h2>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
                disabled={loading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form id="createOwnerForm" onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">First Name <span className="text-rose-500">*</span></label>
                    <input 
                      required
                      type="text" 
                      value={formData.firstName}
                      onChange={e => setFormData({...formData, firstName: e.target.value})}
                      className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Last Name <span className="text-rose-500">*</span></label>
                    <input 
                      required
                      type="text" 
                      value={formData.lastName}
                      onChange={e => setFormData({...formData, lastName: e.target.value})}
                      className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Email Address <span className="text-rose-500">*</span></label>
                    <input 
                      required
                      type="email" 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Password <span className="text-rose-500">*</span></label>
                    <input 
                      required
                      type="password" 
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Mobile Number</label>
                  <input 
                    type="text" 
                    value={formData.mobile}
                    onChange={e => setFormData({...formData, mobile: e.target.value})}
                    className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Address</label>
                  <textarea 
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                    placeholder="Enter full address"
                    rows={3}
                  />
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Assign Organization <span className="text-rose-500">*</span></label>
                    <select
                      required
                      value={formData.organizationId}
                      onChange={e => setFormData({...formData, organizationId: e.target.value})}
                      className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    >
                      <option value="">Select Organization</option>
                      {organizations.map(org => (
                        <option key={org.id} value={org.id}>{org.organizationName}</option>
                      ))}
                    </select>
                  </div>

                  {selectedOrgDetails && (
                    <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 text-xs flex flex-col gap-2">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Org Details:</span>
                        <span className="text-slate-300">{selectedOrgDetails.organizationName}</span>
                      </div>
                      {selectedSubDetails ? (
                        <>
                          <div className="flex items-center justify-between text-slate-400">
                            <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Plan:</span>
                            <span className="text-indigo-400 font-medium">{selectedSubDetails.planName}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-400">
                            <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Max Users:</span>
                            <span className="text-slate-300">{selectedSubDetails.maxUsers}</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-slate-500 italic mt-1 text-center">No active subscription found for this organization.</div>
                      )}
                    </div>
                  )}
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={loading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors border border-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="createOwnerForm"
                disabled={loading}
                className="flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-xs font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-500/20 min-w-[120px]"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Register Owner'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => !loading && setIsEditModalOpen(false)}></div>
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-400" />
                Edit Owner Profile
              </h2>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
                disabled={loading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form id="editOwnerForm" onSubmit={handleEditSubmit} className="space-y-4">
                
                {/* Readonly Info */}
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 mb-6 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Email (ID)</span>
                    <span className="text-slate-300 font-medium">{selectedOwner.email}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Role</span>
                    <span className="text-slate-300 font-medium">{selectedOwner.roles}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Organization</span>
                    <span className="text-slate-300 font-medium">
                      {orgMap[selectedOwner.organizationId]?.organizationName || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">First Name <span className="text-rose-500">*</span></label>
                    <input 
                      required
                      type="text" 
                      value={formData.firstName}
                      onChange={e => setFormData({...formData, firstName: e.target.value})}
                      className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Last Name <span className="text-rose-500">*</span></label>
                    <input 
                      required
                      type="text" 
                      value={formData.lastName}
                      onChange={e => setFormData({...formData, lastName: e.target.value})}
                      className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Mobile Number</label>
                  <input 
                    type="text" 
                    value={formData.mobile}
                    onChange={e => setFormData({...formData, mobile: e.target.value})}
                    className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Address</label>
                  <textarea 
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                    rows={3}
                  />
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-medium text-slate-300">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  >
                    <option value="TRIAL">TRIAL</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                disabled={loading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors border border-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="editOwnerForm"
                disabled={loading}
                className="flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-xs font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-500/20 min-w-[120px]"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
