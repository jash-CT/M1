import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { orders as ordersApi } from '../api/client';

interface OrderRow {
  id: string;
  status: string;
  totalCents: number;
  currency: string;
  createdAt: string;
  team?: { id: string; name: string };
}

export default function Orders() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [data, setData] = useState<{ data: OrderRow[]; total: number; page: number; totalPages: number } | null>(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    setLoading(true);
    ordersApi
      .list(tenantId, { page, limit: 10, status: status || undefined })
      .then((res) => {
        if (!cancelled) setData(res as any);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [tenantId, page, status]);

  if (!tenantId) return <div className="text-amber-700">Select a tenant to view orders.</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (loading && !data) return <div>Loading orders...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
      <p className="mt-1 text-slate-600">Order list for your tenant</p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Total</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Team</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Created</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {data?.data.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3 font-mono text-sm text-slate-900">{o.id.slice(0, 8)}…</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-900">
                  {(o.totalCents / 100).toFixed(2)} {o.currency}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">{o.team?.name ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {new Date(o.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/orders/${o.id}`}
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
