import React, { useState, useEffect, useMemo } from 'react';
import { UserPlus, Users, RefreshCw, X, CheckCircle, AlertCircle, Search, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { createEmployeeApi, changeEmployeeStatusApi, deleteEmployeeApi, getUsersByOrganizationApi } from '../../api/employeeApi';
import { getUserByIdApi } from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';
import { parseJwtPayload } from '../../utils/formatters';

export default function EmployeeManagement() {
  const { user, updateUser } = useAuth();
  const [resolvedOrgId, setResolvedOrgId] = useState(() => {
    return (
      user?.organizationId ||
      user?.orgId ||
      user?.organization?.id ||
      user?.organization?._id ||
      (typeof user?.organization === 'string' ? user.organization : '')
    );
  });

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [actionLoading, setActionLoading] = useState({}); // { [employeeId]: 'toggle' | 'delete' }
  const [actionError, setActionError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // employeeId pending delete confirmation

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    mobile: '',
    address: ''
  });

  // Resolve organization ID from user state, JWT token, or user lookup
  useEffect(() => {
    let orgId =
      user?.organizationId ||
      user?.orgId ||
      user?.organization?.id ||
      user?.organization?._id ||
      (typeof user?.organization === 'string' ? user.organization : '');

    if (orgId) {
      setResolvedOrgId(orgId);
      return;
    }

    const token = localStorage.getItem('tally_auth_token');
    if (token) {
      const payload = parseJwtPayload(token);
      orgId =
        payload?.organizationId ||
        payload?.orgId ||
        payload?.organization ||
        payload?.org ||
        '';
      if (orgId) {
        setResolvedOrgId(orgId);
        if (updateUser) updateUser({ organizationId: orgId });
        return;
      }
    }

    const userId = user?.id || user?.userId || user?._id;
    if (userId) {
      getUserByIdApi(userId)
        .then((res) => {
          const data = res?.data || res;
          const fetchedOrgId =
            data?.organizationId ||
            data?.orgId ||
            data?.organization?.id ||
            data?.organization?._id ||
            (typeof data?.organization === 'string' ? data.organization : '');
          if (fetchedOrgId) {
            setResolvedOrgId(fetchedOrgId);
            if (updateUser) updateUser({ organizationId: fetchedOrgId });
          } else {
            setError('Organization ID not found for this owner.');
            setLoading(false);
          }
        })
        .catch((err) => {
          setError(err.message || 'Failed to retrieve owner organization details.');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchEmployees = async (overrideOrgId) => {
    const orgId = typeof overrideOrgId === 'string' && overrideOrgId ? overrideOrgId : resolvedOrgId;
    if (!orgId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await getUsersByOrganizationApi(orgId);
      const allUsers = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
      const employeeUsers = allUsers
        .filter((u) => u.roles === 'EMPLOYEE' || !u.roles)
        .map((u) => {
          const { password, ...safeUser } = u;
          return safeUser;
        });
      setEmployees(employeeUsers);
    } catch (err) {
      setError(err.message || 'Failed to fetch employees. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resolvedOrgId) {
      fetchEmployees(resolvedOrgId);
    }
  }, [resolvedOrgId]);

  const handleToggleStatus = async (emp) => {
    const isActive = emp.status === 'ACTIVE';
    setActionLoading(prev => ({ ...prev, [emp.id]: 'toggle' }));
    setActionError(null);
    try {
      await changeEmployeeStatusApi(emp.id, !isActive); // true = enable, false = disable
      await fetchEmployees();
    } catch (err) {
      setActionError(err.message || 'Failed to update employee status.');
    } finally {
      setActionLoading(prev => { const n = { ...prev }; delete n[emp.id]; return n; });
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    setActionLoading(prev => ({ ...prev, [employeeId]: 'delete' }));
    setActionError(null);
    setDeleteConfirm(null);
    try {
      await deleteEmployeeApi(employeeId);
      await fetchEmployees();
    } catch (err) {
      setActionError(err.message || 'Failed to delete employee.');
    } finally {
      setActionLoading(prev => { const n = { ...prev }; delete n[employeeId]; return n; });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    setCreateSuccess(false);

    try {
      await createEmployeeApi({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        mobile: formData.mobile,
        address: formData.address
      });
      setCreateSuccess(true);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        mobile: '',
        address: ''
      });
      setTimeout(() => {
        setIsModalOpen(false);
        setCreateSuccess(false);
        fetchEmployees();
      }, 1500);
    } catch (err) {
      setCreateError(err.message || 'Failed to create employee.');
    } finally {
      setCreateLoading(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return employees;
    const query = searchQuery.toLowerCase();
    return employees.filter(emp => 
      (emp.firstName && emp.firstName.toLowerCase().includes(query)) ||
      (emp.lastName && emp.lastName.toLowerCase().includes(query)) ||
      (emp.email && emp.email.toLowerCase().includes(query))
    );
  }, [employees, searchQuery]);

  return (
    <div className="p-6 max-w-7xl mx-auto text-slate-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Employee Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">Manage your organization's employees</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors shadow-lg shadow-indigo-500/20"
        >
          <UserPlus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800/60 flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search employees by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={() => fetchEmployees()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700/50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-slate-400">Loading employees...</p>
          </div>
        ) : error ? (
          <div className="p-6 m-5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex flex-col items-center text-center">
            <AlertCircle className="w-8 h-8 text-rose-400 mb-2" />
            <p className="text-sm text-rose-300 mb-4">{error}</p>
            <button
              onClick={() => fetchEmployees()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Users className="w-12 h-12 text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-300 mb-1">No employees found</h3>
            <p className="text-sm text-slate-500 mb-4">Create your first employee above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {actionError && (
              <div className="mx-5 mt-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {actionError}
                <button onClick={() => setActionError(null)} className="ml-auto text-rose-400 hover:text-rose-200">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800/60">
                <tr>
                  <th className="px-6 py-4 font-semibold">First Name</th>
                  <th className="px-6 py-4 font-semibold">Last Name</th>
                  <th className="px-6 py-4 font-semibold">Email</th>
                  <th className="px-6 py-4 font-semibold">Mobile</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Created Date</th>
                  <th className="px-6 py-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((emp, idx) => (
                    <tr key={emp.id || idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">{emp.firstName || '-'}</td>
                      <td className="px-6 py-4">{emp.lastName || '-'}</td>
                      <td className="px-6 py-4">{emp.email || '-'}</td>
                      <td className="px-6 py-4">{emp.mobile || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          emp.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                          emp.status === 'INACTIVE' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                          'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {emp.status || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* Enable / Disable Toggle */}
                          <button
                            title={emp.status === 'ACTIVE' ? 'Disable Employee' : 'Enable Employee'}
                            disabled={!!actionLoading[emp.id]}
                            onClick={() => handleToggleStatus(emp)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              emp.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-700/50 hover:bg-slate-700 text-slate-400 border border-slate-600/40'
                            }`}
                          >
                            {actionLoading[emp.id] === 'toggle' ? (
                              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : emp.status === 'ACTIVE' ? (
                              <ToggleRight className="w-4 h-4" />
                            ) : (
                              <ToggleLeft className="w-4 h-4" />
                            )}
                            {emp.status === 'ACTIVE' ? 'Enabled' : 'Disabled'}
                          </button>

                          {/* Delete Button */}
                          <button
                            title="Delete Employee"
                            disabled={!!actionLoading[emp.id]}
                            onClick={() => setDeleteConfirm(emp.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionLoading[emp.id] === 'delete' ? (
                              <div className="w-3.5 h-3.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                      No employees match your search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-800/60">
              <h2 className="text-lg font-semibold text-slate-200">Add New Employee</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateEmployee} className="p-5 space-y-4">
              {createSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl flex items-center gap-2 text-xs">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  Employee created successfully! Refreshing...
                </div>
              )}
              
              {createError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl flex items-start gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">First Name</label>
                  <input
                    required
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="John"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Last Name</label>
                  <input
                    required
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Email Address</label>
                <input
                  required
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="john.doe@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Temporary Password</label>
                <input
                  required
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Mobile Number</label>
                <input
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Address</label>
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="123 Business St, City"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800/60 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  {createLoading ? 'Creating...' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-800/60">
              <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-400" />
                Delete Employee
              </h2>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-300">
                Are you sure you want to delete this employee? This action <span className="text-rose-400 font-semibold">cannot be undone</span>.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteEmployee(deleteConfirm)}
                  disabled={!!actionLoading[deleteConfirm]}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading[deleteConfirm] === 'delete' ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
