import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../db';
import type { JwtPayload } from '@enterprise-platform/shared';

export interface AuthRequest extends Request {
  user?: JwtPayload & { id: string };
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized', code: 'MISSING_TOKEN' });
    return;
  }
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload & { sub: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, email: true, platformRole: true, emailVerified: true },
    });
    if (!user) {
      res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }
    req.user = {
      ...decoded,
      id: user.id,
      sub: user.id,
      email: user.email,
      platformRole: decoded.platformRole || (user.platformRole as any),
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
  }
}

export function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    next();
    return;
  }
  jwt.verify(token, config.jwt.secret, (err, decoded) => {
    if (!err && decoded) {
      req.user = decoded as JwtPayload & { id: string; sub: string };
    }
    next();
  });
}
