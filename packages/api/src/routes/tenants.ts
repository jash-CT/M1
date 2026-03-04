import { Router } from 'express';
import { body, query } from 'express-validator';
import { prisma } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { tenantMiddleware, TenantRequest, requirePlatformAdmin, requireTenantRole } from '../middleware/tenant';
import { validate } from '../middleware/validate';
import * as tenantService from '../services/tenantService';
import { AppError } from '../middleware/error';

const router = Router();

router.use(authMiddleware);

router.post(
  '/',
  requirePlatformAdmin,
  validate([
    body('name').trim().isLength({ min: 1, max: 200 }),
    body('slug').trim().matches(/^[a-z0-9-]+$/).withMessage('Slug: lowercase, numbers, hyphens only'),
    body('region').optional().isIn(['apac', 'emea', 'americas']),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const tenant = await tenantService.createTenant({
        name: req.body.name,
        slug: req.body.slug,
        region: req.body.region,
        ownerUserId: req.user!.id,
      });
      res.status(201).json(tenant);
    } catch (e) {
      if (e instanceof Error && e.message.includes('slug')) {
        return next(new AppError(409, e.message, 'SLUG_EXISTS'));
      }
      next(e);
    }
  }
);

router.get(
  '/',
  requirePlatformAdmin,
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('region').optional().isIn(['apac', 'emea', 'americas']),
  ]),
  async (req, res, next) => {
    try {
      const result = await tenantService.listTenants({
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        region: req.query.region as string | undefined,
      });
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const tenant = await tenantService.getTenantById(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found', code: 'NOT_FOUND' });
    const isPlatformAdmin = req.user?.platformRole === 'platform_admin';
    const membership = req.user
      ? await prisma.tenantUser.findUnique({
          where: { userId_tenantId: { userId: req.user.id, tenantId: tenant.id } },
        })
      : null;
    if (!isPlatformAdmin && !membership) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    res.json(tenant);
  } catch (e) {
    next(e);
  }
});

router.post(
  '/:id/invite',
  tenantMiddleware,
  requireTenantRole('owner', 'admin'),
  validate([
    body('email').isEmail().normalizeEmail(),
    body('role').isIn(['admin', 'member', 'viewer']),
    body('teamId').optional().isUUID(),
  ]),
  async (req: TenantRequest, res, next) => {
    try {
      const tenantId = req.params.id;
      if (req.tenantContext?.tenantId !== tenantId) {
        return res.status(403).json({ error: 'Tenant mismatch', code: 'FORBIDDEN' });
      }
      const result = await tenantService.inviteUserToTenant(
        tenantId,
        req.body.email,
        req.body.role,
        req.body.teamId
      );
      res.status(201).json(result);
    } catch (e) {
      if (e instanceof Error && e.message.includes('User not found')) {
        return next(new AppError(404, e.message, 'USER_NOT_FOUND'));
      }
      next(e);
    }
  }
);

export default router;
