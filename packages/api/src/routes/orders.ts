import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { tenantMiddleware, TenantRequest } from '../middleware/tenant';
import { validate } from '../middleware/validate';
import * as orderService from '../services/orderService';
import { recordEvent } from '../services/analyticsService';
import { AppError } from '../middleware/error';

const router = Router();

router.use(tenantMiddleware);

router.post(
  '/',
  validate([
    body('tenantId').isUUID(),
    body('teamId').optional().isUUID(),
    body('items').isArray().custom((items) => {
      if (!items.every((i: unknown) => typeof i === 'object' && i !== null && 'sku' in i && 'quantity' in i && 'unitCents' in i)) {
        throw new Error('Each item must have sku, quantity, unitCents');
      }
      return true;
    }),
    body('metadata').optional().isObject(),
  ]),
  async (req: TenantRequest, res, next) => {
    try {
      const tenantId = req.tenantContext!.tenantId;
      const order = await orderService.createOrder({
        tenantId,
        teamId: req.body.teamId,
        items: req.body.items,
        metadata: req.body.metadata,
      });
      await recordEvent({
        tenantId,
        event: 'order.created',
        payload: { orderId: order.id, totalCents: order.totalCents },
        region: req.tenantContext?.region,
      });
      res.status(201).json(order);
    } catch (e) {
      next(e);
    }
  }
);

router.get(
  '/',
  validate([
    query('tenantId').isUUID(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
    query('teamId').optional().isUUID(),
  ]),
  async (req: TenantRequest, res, next) => {
    try {
      const tenantId = req.tenantContext!.tenantId;
      if (req.query.tenantId !== tenantId) {
        return res.status(403).json({ error: 'Tenant mismatch', code: 'FORBIDDEN' });
      }
      const result = await orderService.listOrders(tenantId, {
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        status: req.query.status as any,
        teamId: req.query.teamId as string | undefined,
      });
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

router.get(
  '/:orderId',
  validate([param('orderId').isUUID()]),
  async (req: TenantRequest, res, next) => {
    try {
      const tenantId = req.tenantContext!.tenantId;
      const order = await orderService.getOrderById(tenantId, req.params.orderId);
      if (!order) return res.status(404).json({ error: 'Order not found', code: 'NOT_FOUND' });
      res.json(order);
    } catch (e) {
      next(e);
    }
  }
);

router.patch(
  '/:orderId/status',
  validate([
    param('orderId').isUUID(),
    body('status').isIn(['draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
    body('note').optional().trim().isLength({ max: 500 }),
  ]),
  async (req: TenantRequest, res, next) => {
    try {
      const tenantId = req.tenantContext!.tenantId;
      const order = await orderService.transitionOrderStatus(
        tenantId,
        req.params.orderId,
        req.body.status,
        req.body.note
      );
      if (!order) return res.status(404).json({ error: 'Order not found', code: 'NOT_FOUND' });
      res.json(order);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Cannot transition')) {
        return next(new AppError(400, e.message, 'INVALID_STATUS_TRANSITION'));
      }
      next(e);
    }
  }
);

export default router;
