import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { integrations as integrationsApi } from '../api/client';

interface Integration {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
}

export default function Integrations() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [list, setList] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tenantId) return;
    integrationsApi
      .list(tenantId)
      .then((res) => setList(res as Integration[]))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tenantId]);

  async function handleDeactivate(id: string) {
    if (!tenantId) return;
    try {
      await integrationsApi.delete(tenantId, id);
      setList((prev) => prev.map((i) => (i.id === id ? { ...i, isActive: false } : i)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  if (!tenantId) return <div className="text-amber-700">Select a tenant to manage integrations.</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
      <p className="mt-1 text-slate-600">Webhooks, API keys, and third-party connections</p>

      {loading ? (
        <div className="mt-8">Loading...</div>
      ) : (
        <div className="mt-8 space-y-4">
          {list.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
              No integrations yet. Create one via API (POST /api/integrations with tenantId and type: webhook | api_key | oauth).
            </div>
          ) : (
            list.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">{i.name}</p>
                  <p className="text-sm text-slate-500">
                    {i.type} · {i.isActive ? 'Active' : 'Inactive'}
                  </p>
                  {Object.keys(i.config).length > 0 && (
                    <p className="mt-1 font-mono text-xs text-slate-400">
                      Config: {JSON.stringify(i.config)}
                    </p>
                  )}
                </div>
                {i.isActive && (
                  <button
                    type="button"
                    onClick={() => handleDeactivate(i.id)}
                    className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
