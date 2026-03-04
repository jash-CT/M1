import { Router } from 'express';
import { query, body } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { requirePlatformAdmin } from '../middleware/tenant';
import { validate } from '../middleware/validate';
import * as analyticsService from '../services/analyticsService';
import type { TenantRequest } from '../middleware/tenant';

const router = Router();

router.post(
  '/events',
  authMiddleware,
  tenantMiddleware,
  validate([
    body('event').trim().isLength({ min: 1, max: 100 }),
    body('payload').optional().isObject(),
  ]),
  async (req: TenantRequest, res, next) => {
    try {
      const tenantId = req.tenantContext!.tenantId;
      const event = await analyticsService.recordEvent({
        tenantId,
        event: req.body.event,
        payload: req.body.payload ?? {},
        region: req.tenantContext?.region,
      });
      res.status(201).json(event);
    } catch (e) {
      next(e);
    }
  }
);

router.get(
  '/metrics/orders',
  authMiddleware,
  tenantMiddleware,
  validate([
    query('tenantId').isUUID(),
    query('from').isISO8601(),
    query('to').isISO8601(),
    query('byRegion').optional().isIn(['true', 'false']),
  ]),
  async (req: TenantRequest, res, next) => {
    try {
      const tenantId = req.tenantContext!.tenantId;
      const from = new Date(req.query.from as string);
      const to = new Date(req.query.to as string);
      const byRegion = req.query.byRegion === 'true';
      const metrics = await analyticsService.getOrderMetrics(tenantId, from, to, { byRegion });
      res.json(metrics);
    } catch (e) {
      next(e);
    }
  }
);

router.get(
  '/platform',
  authMiddleware,
  requirePlatformAdmin,
  validate([
    query('from').isISO8601(),
    query('to').isISO8601(),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const from = new Date(req.query.from as string);
      const to = new Date(req.query.to as string);
      const metrics = await analyticsService.getPlatformMetrics(from, to);
      res.json(metrics);
    } catch (e) {
      next(e);
    }
  }
);

export default router;
