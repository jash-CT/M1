import { Router } from 'express';
import { body, param } from 'express-validator';
import { tenantMiddleware, TenantRequest } from '../middleware/tenant';
import { validate } from '../middleware/validate';
import * as integrationService from '../services/integrationService';

const router = Router();

router.use(tenantMiddleware);

router.post(
  '/',
  validate([
    body('tenantId').isUUID(),
    body('type').isIn(['webhook', 'api_key', 'oauth']),
    body('name').trim().isLength({ min: 1, max: 200 }),
    body('config').isObject(),
    body('secret').optional().isString(),
  ]),
  async (req: TenantRequest, res, next) => {
    try {
      const tenantId = req.tenantContext!.tenantId;
      if (req.body.tenantId !== tenantId) {
        return res.status(403).json({ error: 'Tenant mismatch', code: 'FORBIDDEN' });
      }
      const integration = await integrationService.createIntegration({
        tenantId,
        type: req.body.type,
        name: req.body.name,
        config: req.body.config,
        secret: req.body.secret,
      });
      res.status(201).json(integration);
    } catch (e) {
      next(e);
    }
  }
);

router.get(
  '/',
  async (req: TenantRequest, res, next) => {
    try {
      const tenantId = req.tenantContext!.tenantId;
      const list = await integrationService.listIntegrations(tenantId);
      res.json(list);
    } catch (e) {
      next(e);
    }
  }
);

router.get(
  '/:id',
  validate([param('id').isUUID()]),
  async (req: TenantRequest, res, next) => {
    try {
      const tenantId = req.tenantContext!.tenantId;
      const integration = await integrationService.getIntegrationById(tenantId, req.params.id);
      if (!integration) {
        return res.status(404).json({ error: 'Integration not found', code: 'NOT_FOUND' });
      }
      res.json(integration);
    } catch (e) {
      next(e);
    }
  }
);

router.delete(
  '/:id',
  validate([param('id').isUUID()]),
  async (req: TenantRequest, res, next) => {
    try {
      const tenantId = req.tenantContext!.tenantId;
      await integrationService.deactivateIntegration(tenantId, req.params.id);
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  }
);

export default router;
