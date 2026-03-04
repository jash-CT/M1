const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

export async function api<T>(
  path: string,
  options: RequestInit & { tenantId?: string } = {}
): Promise<T> {
  const { tenantId, ...fetchOptions } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (tenantId) headers['X-Tenant-ID'] = tenantId;

  const url = tenantId && path.includes('?') ? `${API_BASE}${path}&tenantId=${tenantId}` : tenantId ? `${API_BASE}${path}?tenantId=${tenantId}` : `${API_BASE}${path}`;
  const res = await fetch(url, { ...fetchOptions, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Request failed', data.code);
  return data as T;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const auth = {
  login: (email: string, password: string) =>
    api<{ user: unknown; accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (body: { email: string; password: string; name?: string; tenantId?: string; tenantRole?: string; teamId?: string }) =>
    api<{ user: unknown; accessToken: string; refreshToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  refresh: (refreshToken: string) =>
    api<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
  me: () => api<{ user: unknown }>('/auth/me'),
};

export const tenants = {
  list: (params?: { page?: number; limit?: number; region?: string }) =>
    api<{ data: unknown[]; total: number; page: number; limit: number; totalPages: number }>(
      `/tenants?${new URLSearchParams(params as Record<string, string>).toString()}`
    ),
  get: (id: string) => api<unknown>(`/tenants/${id}`),
  create: (body: { name: string; slug: string; region?: string }) =>
    api<unknown>('/tenants', { method: 'POST', body: JSON.stringify(body) }),
  invite: (tenantId: string, body: { email: string; role: string; teamId?: string }) =>
    api<unknown>(`/tenants/${tenantId}/invite`, {
      method: 'POST',
      body: JSON.stringify(body),
      tenantId,
    }),
};

export const orders = {
  list: (tenantId: string, params?: { page?: number; limit?: number; status?: string; teamId?: string }) =>
    api<{ data: unknown[]; total: number; page: number; limit: number; totalPages: number }>(
      `/orders?tenantId=${tenantId}&${new URLSearchParams(params as Record<string, string>).toString()}`
    ),
  get: (tenantId: string, orderId: string) =>
    api<unknown>(`/orders/${orderId}?tenantId=${tenantId}`),
  create: (tenantId: string, body: { teamId?: string; items: { sku: string; name?: string; quantity: number; unitCents: number }[]; metadata?: object }) =>
    api<unknown>('/orders', {
      method: 'POST',
      body: JSON.stringify({ ...body, tenantId }),
      tenantId,
    }),
  updateStatus: (tenantId: string, orderId: string, status: string, note?: string) =>
    api<unknown>(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
      tenantId,
    }),
};

export const analytics = {
  orderMetrics: (tenantId: string, from: string, to: string, byRegion?: boolean) =>
    api<{ totalOrders: number; totalRevenueCents: number; byStatus: Record<string, number>; byRegion?: Record<string, { orders: number; revenueCents: number }> }>(
      `/analytics/metrics/orders?tenantId=${tenantId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${byRegion ? '&byRegion=true' : ''}`
    ),
  platformMetrics: (from: string, to: string) =>
    api<{ tenantCount: number; userCount: number; orderCount: number; totalRevenueCents: number }>(
      `/analytics/platform?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    ),
};

export const integrations = {
  list: (tenantId: string) =>
    api<unknown[]>(`/integrations?tenantId=${tenantId}`, { tenantId }),
  get: (tenantId: string, id: string) =>
    api<unknown>(`/integrations/${id}?tenantId=${tenantId}`, { tenantId }),
  create: (tenantId: string, body: { type: string; name: string; config: object }) =>
    api<unknown>('/integrations', {
      method: 'POST',
      body: JSON.stringify({ ...body, tenantId }),
      tenantId,
    }),
  delete: (tenantId: string, id: string) =>
    api<void>(`/integrations/${id}?tenantId=${tenantId}`, { method: 'DELETE', tenantId }),
};
