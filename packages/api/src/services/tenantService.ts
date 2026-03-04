import { prisma } from '../db';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@enterprise-platform/shared';
import type { PaginationParams, PaginatedResult } from '@enterprise-platform/shared';

export interface CreateTenantInput {
  name: string;
  slug: string;
  region?: string;
  ownerUserId: string;
}

export async function createTenant(input: CreateTenantInput) {
  const existing = await prisma.tenant.findUnique({ where: { slug: input.slug } });
  if (existing) throw new Error('Tenant slug already exists');

  return prisma.tenant.create({
    data: {
      name: input.name,
      slug: input.slug,
      region: input.region,
      users: {
        create: {
          userId: input.ownerUserId,
          role: 'owner',
          joinedAt: new Date(),
        },
      },
    },
    include: { users: { include: { user: { select: { id: true, email: true, name: true } } } } },
  });
}

export async function listTenants(params: PaginationParams & { region?: string }) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, params.limit ?? DEFAULT_PAGE_SIZE));
  const skip = (page - 1) * limit;

  const where = params.region ? { region: params.region } : {};
  const [data, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, orders: true } },
      },
    }),
    prisma.tenant.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  } as PaginatedResult<typeof data[0]>;
}

export async function getTenantById(id: string) {
  return prisma.tenant.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, orders: true } },
      teams: true,
    },
  });
}

export async function getTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug },
    include: { teams: true },
  });
}

export async function inviteUserToTenant(
  tenantId: string,
  email: string,
  role: string,
  teamId?: string
) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('User not found');

  return prisma.tenantUser.upsert({
    where: {
      userId_tenantId: { userId: user.id, tenantId },
    },
    update: { role, teamId: teamId ?? undefined },
    create: {
      userId: user.id,
      tenantId,
      teamId: teamId ?? undefined,
      role,
      invitedAt: new Date(),
    },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
}
