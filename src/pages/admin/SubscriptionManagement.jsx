import React, { useState, useEffect } from 'react';
import { 
  Plus, Pencil, Trash2, CreditCard, RefreshCw, 
  X, CheckCircle, AlertCircle, Users 
} from 'lucide-react';
import { 
  getAllSubscriptionsApi, 
  createSubscriptionApi, 
  updateSubscriptionApi, 
  deleteSubscriptionApi 
} from '../../api/subscriptionApi';

export default function SubscriptionManagement() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentSub, setCurrentSub] = useState(null);

  const [formData, setFormData] = useState({
    planName: '',
    maxUsers: '',
    status: 'ACTIVE'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const response = await getAllSubscriptionsApi();
      setSubscriptions(Array.isArray(response) ? response : []);
    } catch (err) {
      setError(err.message || 'Failed to fetch subscriptions');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleOpenModal = (sub = null) => {
    if (sub) {
      setCurrentSub(sub);
      setFormData({
        planName: sub.planName,
        maxUsers: sub.maxUsers,
        status: sub.status
      });
    } else {
      setCurrentSub(null);
      setFormData({
        planName: '',
        maxUsers: '',
        status: 'ACTIVE'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentSub(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (currentSub) {
        await updateSubscriptionApi(currentSub._id || currentSub.id, {
          ...formData,
          maxUsers: Number(formData.maxUsers)
        });
        showSuccess('Subscription updated successfully');
      } else {
        await createSubscriptionApi({
          ...formData,
          maxUsers: Number(formData.maxUsers)
        });
        showSuccess('Subscription created successfully');
      }
      handleCloseModal();
      fetchSubscriptions();
    } catch (err) {
      setError(err.message || 'Failed to save subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (sub) => {
    setCurrentSub(sub);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await deleteSubscriptionApi(currentSub._id || currentSub.id);
      showSuccess('Subscription deleted successfully');
      setIsDeleteDialogOpen(false);
      setCurrentSub(null);
      fetchSubscriptions();
    } catch (err) {
      setError(err.message || 'Failed to delete subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-indigo-400" />
            Subscription Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage subscription plans and limits</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchSubscriptions(true)}
            disabled={isLoading || isRefreshing}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Subscription
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-xs">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <p>{successMsg}</p>
        </div>
      )}

      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {isLoading && !isRefreshing ? (
          <div className="flex justify-center items-center p-12">
            <div className="border-4 border-indigo-500 border-t-transparent rounded-full animate-spin w-8 h-8"></div>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-sm">
            <CreditCard className="w-12 h-12 mb-3 opacity-20" />
            <p>No subscriptions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60">
                <tr>
                  <th className="px-5 py-3 font-semibold text-slate-300">Plan Name</th>
                  <th className="px-5 py-3 font-semibold text-slate-300">Max Users</th>
                  <th className="px-5 py-3 font-semibold text-slate-300">Status</th>
                  <th className="px-5 py-3 font-semibold text-slate-300">Created Date</th>
                  <th className="px-5 py-3 font-semibold text-slate-300">Updated Date</th>
                  <th className="px-5 py-3 font-semibold text-slate-300 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {subscriptions.map(sub => (
                  <tr key={sub._id || sub.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-medium text-slate-200">{sub.planName}</td>
                    <td className="px-5 py-4 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        {sub.maxUsers}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        sub.status === 'ACTIVE' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-slate-700/40 text-slate-400 border-slate-600/50'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400">{formatDate(sub.createdAt)}</td>
                    <td className="px-5 py-4 text-slate-400">{formatDate(sub.updatedAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(sub)}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenDelete(sub)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-800/60">
              <h3 className="text-sm font-semibold text-slate-100">
                {currentSub ? 'Edit Subscription' : 'Create Subscription'}
              </h3>
              <button 
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Plan Name</label>
                <input 
                  type="text"
                  name="planName"
                  value={formData.planName}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50"
                  placeholder="e.g. Pro Plan"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Max Users</label>
                <input 
                  type="number"
                  name="maxUsers"
                  value={formData.maxUsers}
                  onChange={handleInputChange}
                  required
                  min="1"
                  className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50"
                  placeholder="e.g. 10"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Status</label>
                <select 
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/60 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <div className="border-2 border-white/20 border-t-white rounded-full animate-spin w-3 h-3"></div>}
                  {currentSub ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsDeleteDialogOpen(false)}></div>
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-5 text-center">
            <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-rose-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100 mb-2">Delete Subscription</h3>
            <p className="text-xs text-slate-400 mb-6">
              Are you sure you want to delete <span className="font-semibold text-slate-200">{currentSub?.planName}</span>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting && <div className="border-2 border-white/20 border-t-white rounded-full animate-spin w-3 h-3"></div>}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
