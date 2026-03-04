import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-slate-600">Welcome back, {user?.name || user?.email}.</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {user?.tenantId && (
          <>
            <Link
              to="/orders"
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-200 hover:shadow-md"
            >
              <h2 className="font-semibold text-slate-900">Orders</h2>
              <p className="mt-1 text-sm text-slate-500">View and manage orders</p>
            </Link>
            <Link
              to="/analytics"
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-200 hover:shadow-md"
            >
              <h2 className="font-semibold text-slate-900">Analytics</h2>
              <p className="mt-1 text-sm text-slate-500">Order metrics and reports</p>
            </Link>
            <Link
              to="/integrations"
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-200 hover:shadow-md"
            >
              <h2 className="font-semibold text-slate-900">Integrations</h2>
              <p className="mt-1 text-sm text-slate-500">Webhooks and API keys</p>
            </Link>
          </>
        )}
        {user?.platformRole === 'platform_admin' && (
          <>
            <Link
              to="/tenants"
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-200 hover:shadow-md"
            >
              <h2 className="font-semibold text-slate-900">Tenants</h2>
              <p className="mt-1 text-sm text-slate-500">Manage organizations</p>
            </Link>
            <Link
              to="/platform"
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-200 hover:shadow-md"
            >
              <h2 className="font-semibold text-slate-900">Platform metrics</h2>
              <p className="mt-1 text-sm text-slate-500">Cross-tenant analytics</p>
            </Link>
          </>
        )}
      </div>

      {!user?.tenantId && user?.platformRole !== 'platform_admin' && (
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-amber-800">
            You are not assigned to a tenant. Ask an administrator to invite you or create a new
            organization (platform admin only).
          </p>
        </div>
      )}
    </div>
  );
}
