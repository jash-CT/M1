import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tenants as tenantsApi } from '../api/client';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  region: string | null;
  _count: { users: number; orders: number };
}

export default function Tenants() {
  const [data, setData] = useState<{ data: TenantRow[]; total: number; page: number; totalPages: number } | null>(null);
  const [region, setRegion] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    tenantsApi
      .list({ page, limit: 10, region: region || undefined })
      .then((res) => {
        if (!cancelled) setData(res as any);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [page, region]);

  if (error) return <div className="text-red-600">{error}</div>;
  if (loading && !data) return <div>Loading tenants...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Tenants</h1>
      <p className="mt-1 text-slate-600">Organizations by region</p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <select
          value={region}
          onChange={(e) => { setRegion(e.target.value); setPage(1); }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All regions</option>
          <option value="americas">Americas</option>
          <option value="emea">EMEA</option>
          <option value="apac">APAC</option>
        </select>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Slug</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Region</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Users</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Orders</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {data?.data.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{t.name}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{t.slug}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{t.region ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{t._count.users}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{t._count.orders}</td>
                <td className="px-4 py-3">
                  <Link
                    to={`/tenants/${t.id}`}
                    className="text-brand-600 hover:text-brand-700 font-medium text-sm"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Page {data.page} of {data.totalPages} ({data.total} total)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
