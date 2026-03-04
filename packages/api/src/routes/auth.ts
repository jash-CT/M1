import { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as authService from '../services/authService';
import { AppError } from '../middleware/error';

const router = Router();

router.post(
  '/register',
  validate([
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password min 8 characters'),
    body('name').optional().trim().isLength({ max: 200 }),
    body('tenantId').optional().isUUID(),
    body('tenantRole').optional().isIn(['owner', 'admin', 'member', 'viewer']),
    body('teamId').optional().isUUID(),
  ]),
  async (req, res, next) => {
    try {
      const result = await authService.register({
        email: req.body.email,
        password: req.body.password,
        name: req.body.name,
        tenantId: req.body.tenantId,
        tenantRole: req.body.tenantRole,
        teamId: req.body.teamId,
      });
      res.status(201).json(result);
    } catch (e) {
      if (e instanceof Error) {
        if (e.message.includes('already registered')) {
          return next(new AppError(409, e.message, 'EMAIL_EXISTS'));
        }
      }
      next(e);
    }
  }
);

router.post(
  '/login',
  validate([
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ]),
  async (req, res, next) => {
    try {
      const result = await authService.login(req.body.email, req.body.password);
      res.json(result);
    } catch (e) {
      if (e instanceof Error && e.message.includes('Invalid')) {
        return next(new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS'));
      }
      next(e);
    }
  }
);

router.post(
  '/refresh',
  validate([body('refreshToken').notEmpty()]),
  async (req, res, next) => {
    try {
      const result = await authService.refreshTokens(req.body.refreshToken);
      res.json(result);
    } catch (e) {
      if (e instanceof Error) {
        return next(new AppError(401, 'Invalid or expired refresh token', 'INVALID_REFRESH'));
      }
      next(e);
    }
  }
);

router.get('/me', authMiddleware, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

export default router;
