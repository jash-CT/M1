import { prisma } from '../db';

export interface RecordEventInput {
  tenantId: string;
  event: string;
  payload: Record<string, unknown>;
  region?: string;
}

export async function recordEvent(input: RecordEventInput) {
  return prisma.analyticsEvent.create({
    data: {
      tenantId: input.tenantId,
      event: input.event,
      payload: input.payload as object,
      region: input.region,
    },
  });
}

export interface OrderMetrics {
  totalOrders: number;
  totalRevenueCents: number;
  byStatus: Record<string, number>;
  byRegion?: Record<string, { orders: number; revenueCents: number }>;
}

export async function getOrderMetrics(
  tenantId: string,
  from: Date,
  to: Date,
  options?: { byRegion?: boolean }
): Promise<OrderMetrics> {
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      createdAt: { gte: from, lte: to },
      status: { not: 'cancelled' },
    },
    include: { team: true },
  });

  const totalOrders = orders.length;
  const totalRevenueCents = orders.reduce((s, o) => s + o.totalCents, 0);
  const byStatus: Record<string, number> = {};
  for (const o of orders) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
  }

  let byRegion: Record<string, { orders: number; revenueCents: number }> | undefined;
  if (options?.byRegion) {
    byRegion = {};
    for (const o of orders) {
      const region = o.team?.region ?? 'unknown';
      if (!byRegion[region]) byRegion[region] = { orders: 0, revenueCents: 0 };
      byRegion[region].orders += 1;
      byRegion[region].revenueCents += o.totalCents;
    }
  }

  return {
    totalOrders,
    totalRevenueCents,
    byStatus,
    byRegion,
  };
}

export async function getEventCounts(
  tenantId: string,
  event: string,
  from: Date,
  to: Date
) {
  return prisma.analyticsEvent.count({
    where: {
      tenantId,
      event,
      createdAt: { gte: from, lte: to },
    },
  });
}

export async function getPlatformMetrics(from: Date, to: Date) {
  const [tenantCount, userCount, orderCount, revenue] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.order.count({
      where: {
        createdAt: { gte: from, lte: to },
        status: { not: 'cancelled' },
      },
    }),
    prisma.order.aggregate({
      where: {
        createdAt: { gte: from, lte: to },
        status: { notIn: ['cancelled', 'refunded'] },
      },
      _sum: { totalCents: true },
    }),
  ]);

  return {
    tenantCount,
    userCount,
    orderCount,
    totalRevenueCents: revenue._sum.totalCents ?? 0,
  };
}
