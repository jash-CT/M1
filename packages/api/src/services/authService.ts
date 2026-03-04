import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db';
import { config } from '../config';
import type { JwtPayload, TenantRole, PlatformRole } from '@enterprise-platform/shared';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
}

export function verifyRefreshToken(token: string): { userId: string } {
  const decoded = jwt.verify(token, config.jwt.refreshSecret) as { sub: string; type: string };
  if (decoded.type !== 'refresh') throw new Error('Invalid token type');
  return { userId: decoded.sub };
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  tenantId?: string;
  tenantRole?: TenantRole;
  teamId?: string;
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new Error('Email already registered');

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      platformRole: 'user',
    },
  });

  if (input.tenantId) {
    await prisma.tenantUser.create({
      data: {
        userId: user.id,
        tenantId: input.tenantId,
        teamId: input.teamId ?? undefined,
        role: input.tenantRole ?? 'member',
        joinedAt: new Date(),
      },
    });
  }

  const membership = await prisma.tenantUser.findFirst({
    where: { userId: user.id },
    include: { tenant: true },
  });

  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: user.id,
    email: user.email,
    platformRole: user.platformRole as PlatformRole,
    region: membership?.tenant.region ?? undefined,
  };
  if (membership) {
    payload.tenantId = membership.tenantId;
    payload.tenantRole = membership.role as TenantRole;
  }

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      platformRole: user.platformRole,
      tenantId: membership?.tenantId,
      tenantRole: membership?.role,
    },
    accessToken,
    refreshToken,
    expiresIn: config.jwt.expiresIn,
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { tenants: { include: { tenant: true } } },
  });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new Error('Invalid email or password');
  }

  const membership = user.tenants[0];
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: user.id,
    email: user.email,
    platformRole: user.platformRole as PlatformRole,
    region: membership?.tenant.region ?? undefined,
  };
  if (membership) {
    payload.tenantId = membership.tenantId;
    payload.tenantRole = membership.role as TenantRole;
  }

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      platformRole: user.platformRole,
      tenantId: membership?.tenantId,
      tenantRole: membership?.role,
    },
    accessToken,
    refreshToken,
    expiresIn: config.jwt.expiresIn,
  };
}

export async function refreshTokens(refreshToken: string) {
  const { userId } = verifyRefreshToken(refreshToken);
  const stored = await prisma.refreshToken.findFirst({
    where: { token: refreshToken, userId },
  });
  if (!stored || stored.expiresAt < new Date()) {
    throw new Error('Invalid or expired refresh token');
  }
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tenants: { include: { tenant: true } } },
  });
  if (!user) throw new Error('User not found');

  const membership = user.tenants[0];
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: user.id,
    email: user.email,
    platformRole: user.platformRole as PlatformRole,
    region: membership?.tenant.region ?? undefined,
  };
  if (membership) {
    payload.tenantId = membership.tenantId;
    payload.tenantRole = membership.role as TenantRole;
  }

  const accessToken = signAccessToken(payload);
  const newRefresh = signRefreshToken(user.id);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: newRefresh,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    accessToken,
    refreshToken: newRefresh,
    expiresIn: config.jwt.expiresIn,
  };
}
