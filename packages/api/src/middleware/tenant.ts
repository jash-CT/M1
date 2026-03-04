import { Response, NextFunction } from 'express';
import { prisma } from '../db';
import type { AuthRequest } from './auth';
import type { TenantContext, TenantRole } from '@enterprise-platform/shared';

export interface TenantRequest extends AuthRequest {
  tenantContext?: TenantContext;
  tenantRole?: TenantRole;
}

/** Require user to belong to a tenant (tenantId in body, query, or header). */
export async function tenantMiddleware(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const tenantId =
    (req.body?.tenantId as string) ||
    (req.query?.tenantId as string) ||
    (req.headers['x-tenant-id'] as string);
  if (!tenantId || !req.user) {
    res.status(400).json({ error: 'Tenant context required', code: 'MISSING_TENANT' });
    return;
  }
  const membership = await prisma.tenantUser.findUnique({
    where: {
      userId_tenantId: { userId: req.user.id, tenantId },
    },
    include: { tenant: true, team: true },
  });
  if (!membership) {
    res.status(403).json({ error: 'Not a member of this tenant', code: 'FORBIDDEN_TENANT' });
    return;
  }
  req.tenantContext = {
    tenantId,
    region: membership.tenant.region ?? undefined,
    teamIds: membership.teamId ? [membership.teamId] : undefined,
  };
  req.tenantRole = membership.role as TenantRole;
  next();
}

/** Require platform admin. */
export function requirePlatformAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.platformRole !== 'platform_admin') {
    res.status(403).json({ error: 'Platform admin required', code: 'FORBIDDEN' });
    return;
  }
  next();
}

/** Require tenant role (e.g. owner or admin). */
export function requireTenantRole(...allowed: TenantRole[]) {
  return (req: TenantRequest, res: Response, next: NextFunction): void => {
    if (!req.tenantRole || !allowed.includes(req.tenantRole)) {
      res.status(403).json({
        error: `Required role: ${allowed.join(' or ')}`,
        code: 'INSUFFICIENT_ROLE',
      });
      return;
    }
    next();
  };
}
