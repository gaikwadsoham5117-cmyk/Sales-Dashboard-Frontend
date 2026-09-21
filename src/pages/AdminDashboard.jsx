import React, { useState, useEffect } from 'react';
import { getAllUsersApi } from '../api/adminApi';
import { getAllOrganizationsApi } from '../api/organizationApi';
import { getAllSubscriptionsApi } from '../api/subscriptionApi';
import StatCard from '../components/common/StatCard';
import { Users, Building2, CreditCard, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ owners: 0, organizations: 0, subscriptions: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const [users, orgs, subs] = await Promise.all([
        getAllUsersApi().catch(() => []),
        getAllOrganizationsApi().catch(() => []),
        getAllSubscriptionsApi().catch(() => []),
      ]);
      const ownerCount = Array.isArray(users)
        ? users.filter((u) => u.roles === 'OWNER').length
        : 0;
      setStats({
        owners:        ownerCount,
        organizations: Array.isArray(orgs) ? orgs.length : 0,
        subscriptions: Array.isArray(subs) ? subs.length : 0,
      });
    } catch {
      setError('Unable to load dashboard statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  return (
    <div className="space-y-5 pb-12">

      {/* Page header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              Admin Dashboard
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              System overview — manage owners, organizations, and subscription plans
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300 text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Loading dashboard...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Owners"
              value={stats.owners.toString()}
              subtext="Registered business owners"
              icon={Users}
              colorTheme="blue"
            />
            <StatCard
              title="Total Organizations"
              value={stats.organizations.toString()}
              subtext="Active organizations"
              icon={Building2}
              colorTheme="blue"
            />
            <StatCard
              title="Total Subscriptions"
              value={stats.subscriptions.toString()}
              subtext="Available subscription plans"
              icon={CreditCard}
              colorTheme="blue"
            />
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  href: '/admin/owners',
                  icon: Users,
                  label: 'Manage Owners',
                  sub: 'Create and manage owner accounts',
                },
                {
                  href: '/admin/organizations',
                  icon: Building2,
                  label: 'Manage Organizations',
                  sub: 'Create and assign subscriptions',
                },
                {
                  href: '/admin/subscriptions',
                  icon: CreditCard,
                  label: 'Manage Subscriptions',
                  sub: 'Plans and user limits',
                },
              ].map(({ href, icon: Icon, label, sub }) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group"
                >
                  <div className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group-hover:border-blue-200 dark:group-hover:border-blue-800 transition-colors">
                    <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                      {label}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
