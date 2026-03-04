/** Role within a tenant */
export type TenantRole = 'owner' | 'admin' | 'member' | 'viewer';

/** Platform-level role (super admin) */
export type PlatformRole = 'platform_admin' | 'platform_support' | 'user';

/** Order status lifecycle */
export type OrderStatus =
  | 'draft'
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

/** Integration type */
export type IntegrationType = 'webhook' | 'api_key' | 'oauth';

/** JWT payload */
export interface JwtPayload {
  sub: string;
  email: string;
  tenantId?: string;
  tenantRole?: TenantRole;
  platformRole: PlatformRole;
  region?: string;
  iat?: number;
  exp?: number;
}

/** Pagination */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Tenant context (set by middleware) */
export interface TenantContext {
  tenantId: string;
  region?: string;
  teamIds?: string[];
}
