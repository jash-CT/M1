import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tenants as tenantsApi } from '../api/client';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  region: string | null;
  teams: { id: string; name: string; region: string | null }[];
  _count: { users: number; orders: number };
}

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    tenantsApi
      .get(id)
      .then(setTenant as (t: unknown) => void)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="text-red-600">{error}</div>;
  if (!tenant) return <div>Loading...</div>;

  return (
    <div>
      <Link to="/tenants" className="text-sm font-medium text-brand-600 hover:text-brand-700">
        ← Tenants
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">{tenant.name}</h1>
      <p className="mt-1 text-slate-600">{tenant.slug} · {tenant.region ?? 'No region'}</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Counts</h2>
          <p className="mt-2 text-3xl font-bold text-slate-900">{tenant._count.users} users</p>
          <p className="text-3xl font-bold text-slate-900">{tenant._count.orders} orders</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Teams</h2>
          <ul className="mt-2 space-y-1">
            {tenant.teams.length === 0 ? (
              <li className="text-slate-500">No teams</li>
            ) : (
              tenant.teams.map((t) => (
                <li key={t.id} className="text-sm">
                  {t.name} {t.region && `· ${t.region}`}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
