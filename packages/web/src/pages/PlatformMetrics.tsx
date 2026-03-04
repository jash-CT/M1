import { useState, useEffect } from 'react';
import { analytics as analyticsApi } from '../api/client';

function useDateRange() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  return {
    from: `${from}T00:00:00.000Z`,
    to: `${to}T23:59:59.999Z`,
    setFrom,
    setTo,
    fromInput: from,
    toInput: to,
  };
}

export default function PlatformMetrics() {
  const { from, to, setFrom, setTo, fromInput, toInput } = useDateRange();
  const [data, setData] = useState<{
    tenantCount: number;
    userCount: number;
    orderCount: number;
    totalRevenueCents: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    analyticsApi
      .platformMetrics(from, to)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [from, to]);

  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Platform metrics</h1>
      <p className="mt-1 text-slate-600">Cross-tenant analytics (admin only)</p>

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
      </div>

      {loading ? (
        <div className="mt-8">Loading...</div>
      ) : data ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Tenants</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{data.tenantCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Users</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{data.userCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Orders (period)</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{data.orderCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Revenue (period)</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              ${(data.totalRevenueCents / 100).toFixed(2)}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
