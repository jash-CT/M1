import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { analytics as analyticsApi } from '../api/client';

function useDateRange() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  return { from: `${from}T00:00:00.000Z`, to: `${to}T23:59:59.999Z`, setFrom, setTo, fromInput: from, toInput: to };
}

export default function Analytics() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const { from, to, setFrom, setTo, fromInput, toInput } = useDateRange();
  const [byRegion, setByRegion] = useState(false);
  const [data, setData] = useState<{
    totalOrders: number;
    totalRevenueCents: number;
    byStatus: Record<string, number>;
    byRegion?: Record<string, { orders: number; revenueCents: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    analyticsApi
      .orderMetrics(tenantId, from, to, byRegion)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tenantId, from, to, byRegion]);

  if (!tenantId) return <div className="text-amber-700">Select a tenant to view analytics.</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
      <p className="mt-1 text-slate-600">Order metrics for your tenant</p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
          <span className="text-sm text-slate-700">From</span>
          <input
            type="date"
            value={fromInput}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-sm text-slate-700">To</span>
          <input
            type="date"
            value={toInput}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={byRegion}
            onChange={(e) => setByRegion(e.target.checked)}
            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm text-slate-700">Break down by region</span>
        </label>
      </div>

      {loading ? (
        <div className="mt-8">Loading...</div>
      ) : data ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total orders</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{data.totalOrders}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Revenue</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              ${(data.totalRevenueCents / 100).toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">By status</p>
            <ul className="mt-2 space-y-1 text-sm">
              {Object.entries(data.byStatus).map(([status, count]) => (
                <li key={status}>
                  <span className="font-medium text-slate-700">{status}</span>: {count}
                </li>
              ))}
            </ul>
          </div>
          {data.byRegion && Object.keys(data.byRegion).length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:col-span-2">
              <p className="text-sm font-medium text-slate-500">By region</p>
              <ul className="mt-4 space-y-3">
                {Object.entries(data.byRegion).map(([region, v]) => (
                  <li key={region} className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{region}</span>
                    <span>{v.orders} orders · ${(v.revenueCents / 100).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
