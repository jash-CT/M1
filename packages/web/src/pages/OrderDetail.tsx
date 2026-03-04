import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { orders as ordersApi } from '../api/client';

interface OrderItem {
  id: string;
  sku: string;
  name: string | null;
  quantity: number;
  unitCents: number;
}

interface HistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
}

interface Order {
  id: string;
  status: string;
  totalCents: number;
  currency: string;
  createdAt: string;
  items: OrderItem[];
  history: HistoryEntry[];
  team?: { id: string; name: string };
}

const NEXT_STATUS: Record<string, string[]> = {
  draft: ['pending', 'cancelled'],
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

export default function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [order, setOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tenantId || !orderId) return;
    ordersApi
      .get(tenantId, orderId)
      .then(setOrder as (o: unknown) => void)
      .catch((e) => setError(e.message));
  }, [tenantId, orderId]);

  async function transitionStatus(toStatus: string) {
    if (!tenantId || !orderId) return;
    setUpdating(true);
    try {
      const updated = await ordersApi.updateStatus(tenantId, orderId, toStatus);
      setOrder(updated as Order);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setUpdating(false);
    }
  }

  if (!tenantId) return <div className="text-amber-700">Select a tenant.</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!order) return <div>Loading...</div>;

  const nextStatuses = NEXT_STATUS[order.status] ?? [];

  return (
    <div>
      <Link to="/orders" className="text-sm font-medium text-brand-600 hover:text-brand-700">
        ← Orders
      </Link>
      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Order {order.id.slice(0, 8)}…</h1>
          <p className="mt-1 text-slate-600">
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
              {order.status}
            </span>
            {' · '}
            {(order.totalCents / 100).toFixed(2)} {order.currency}
            {' · '}
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {nextStatuses.map((s) => (
            <button
              key={s}
              type="button"
              disabled={updating}
              onClick={() => transitionStatus(s)}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              → {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Line items</h2>
          <ul className="mt-4 space-y-3">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between text-sm">
                <span>{i.sku} {i.name && `· ${i.name}`} × {i.quantity}</span>
                <span>{(i.quantity * i.unitCents / 100).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-slate-200 pt-4 font-medium">
            Total: {(order.totalCents / 100).toFixed(2)} {order.currency}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Status history</h2>
          <ul className="mt-4 space-y-2">
            {order.history.map((h) => (
              <li key={h.id} className="text-sm text-slate-600">
                {h.fromStatus ?? '—'} → {h.toStatus}
                {' '}
                {new Date(h.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
