import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Building2, RefreshCw, X, CheckCircle, AlertCircle } from 'lucide-react';
import { getAllOrganizationsApi, createOrganizationApi, updateOrganizationApi, deleteOrganizationApi } from '../../api/organizationApi';
import { getAllSubscriptionsApi } from '../../api/subscriptionApi';

export default function OrganizationManagement() {
  const [organizations, setOrganizations] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionMap, setSubscriptionMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [formData, setFormData] = useState({
    organizationName: '',
    subscriptionId: ''
  });
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [orgRes, subRes] = await Promise.all([
        getAllOrganizationsApi(),
        getAllSubscriptionsApi()
      ]);
      
      // Handle potential response structures
      const orgs = Array.isArray(orgRes) ? orgRes : (orgRes?.data || []);
      const subs = Array.isArray(subRes) ? subRes : (subRes?.data || []);
      
      setOrganizations(orgs);
      setSubscriptions(subs);
      
      const subMap = {};
      subs.forEach(sub => {
        const id = sub.id || sub._id || sub.subscriptionId;
        if (id) {
          subMap[id] = sub;
        }
      });
      setSubscriptionMap(subMap);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const openCreateModal = () => {
    clearMessages();
    setModalMode('create');
    setFormData({ organizationName: '', subscriptionId: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (org) => {
    clearMessages();
    setModalMode('edit');
    const id = org.id || org._id || org.organizationId;
    setSelectedOrgId(id);
    setFormData({
      organizationName: org.organizationName || '',
      subscriptionId: org.subscriptionId || ''
    });
    setIsModalOpen(true);
  };

  const openDeleteModal = (org) => {
    clearMessages();
    setOrgToDelete(org);
    setIsDeleteModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedOrgId(null);
    setOrgToDelete(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    
    if (!formData.organizationName || !formData.subscriptionId) {
      setError('Please fill in all required fields.');
      return;
    }

    setActionLoading(true);
    try {
      if (modalMode === 'create') {
        await createOrganizationApi(formData);
        setSuccess('Organization created successfully.');
      } else {
        await updateOrganizationApi(selectedOrgId, formData);
        setSuccess('Organization updated successfully.');
      }
      closeModal();
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.message || `Failed to ${modalMode} organization.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    clearMessages();
    setActionLoading(true);
    try {
      const id = orgToDelete.id || orgToDelete._id || orgToDelete.organizationId;
      await deleteOrganizationApi(id);
      setSuccess('Organization deleted successfully.');
      closeModal();
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete organization.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="space-y-6 text-slate-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-500" />
            Organization Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage tenant organizations and their active subscriptions</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors border border-slate-700 flex-shrink-0"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
          
          <button
            onClick={openCreateModal}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Organization
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {error && !isModalOpen && !isDeleteModalOpen && (
        <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      
      {success && !isModalOpen && !isDeleteModalOpen && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Main Content Area */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {loading && organizations.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400">Loading organizations...</p>
          </div>
        ) : organizations.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Building2 className="w-12 h-12 text-slate-700" />
            <p className="text-sm font-medium text-slate-300">No organizations found</p>
            <p className="text-xs text-slate-500">Get started by creating a new organization.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Organization Name</th>
                  <th className="px-4 py-3 font-semibold">Subscription</th>
                  <th className="px-4 py-3 font-semibold">Created Date</th>
                  <th className="px-4 py-3 font-semibold">Status Updated Date</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {organizations.map((org) => {
                  const orgId = org.id || org._id || org.organizationId;
                  const sub = subscriptionMap[org.subscriptionId];
                  const subName = sub ? sub.planName : 'Unknown Plan';
                  
                  return (
                    <tr key={orgId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-200">
                        {org.organizationName}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {subName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatDate(org.createdAt || org.createdDate)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatDate(org.updatedAt || org.statusUpdatedDate)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(org)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(org)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                {modalMode === 'create' ? <Plus className="w-4 h-4 text-indigo-400" /> : <Pencil className="w-4 h-4 text-indigo-400" />}
                {modalMode === 'create' ? 'Create Organization' : 'Edit Organization'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs mb-4">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="organizationName" className="block text-xs font-medium text-slate-300">
                  Organization Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  id="organizationName"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                  placeholder="e.g. Acme Corp"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="subscriptionId" className="block text-xs font-medium text-slate-300">
                  Subscription Plan <span className="text-rose-400">*</span>
                </label>
                <select
                  id="subscriptionId"
                  name="subscriptionId"
                  value={formData.subscriptionId}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  required
                >
                  <option value="" disabled>Select a subscription plan</option>
                  {subscriptions.map(sub => {
                    const id = sub.id || sub._id || sub.subscriptionId;
                    return (
                      <option key={id} value={id}>
                        {sub.planName} ({sub.maxUsers || 0} users)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="pt-4 mt-6 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center gap-2"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    modalMode === 'create' ? 'Create Organization' : 'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && orgToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-5 text-center">
            <div className="mx-auto w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-rose-500" />
            </div>
            <h2 className="text-sm font-bold text-slate-100 mb-2">Delete Organization?</h2>
            <p className="text-xs text-slate-400 mb-6">
              Are you sure you want to delete <strong className="text-slate-200">{orgToDelete.organizationName}</strong>? This action cannot be undone.
            </p>
            
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs mb-4 text-left">
                {error}
              </div>
            )}
            
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors w-full"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors w-full flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
