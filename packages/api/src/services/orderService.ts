import { prisma } from '../db';
import { ORDER_STATUS_FLOW } from '@enterprise-platform/shared';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@enterprise-platform/shared';
import type { OrderStatus } from '@enterprise-platform/shared';
import type { PaginationParams, PaginatedResult } from '@enterprise-platform/shared';

export interface CreateOrderInput {
  tenantId: string;
  teamId?: string;
  items: { sku: string; name?: string; quantity: number; unitCents: number }[];
  metadata?: Record<string, unknown>;
}

export async function createOrder(input: CreateOrderInput) {
  const totalCents = input.items.reduce((s, i) => s + i.quantity * i.unitCents, 0);
  return prisma.order.create({
    data: {
      tenantId: input.tenantId,
      teamId: input.teamId,
      status: 'draft',
      totalCents,
      metadata: input.metadata ?? undefined,
      items: {
        create: input.items.map((i) => ({
          sku: i.sku,
          name: i.name,
          quantity: i.quantity,
          unitCents: i.unitCents,
        })),
      },
      history: {
        create: [{ fromStatus: null, toStatus: 'draft' }],
      },
    },
    include: { items: true, history: true },
  });
}

export async function listOrders(
  tenantId: string,
  params: PaginationParams & { status?: OrderStatus; teamId?: string }
) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, params.limit ?? DEFAULT_PAGE_SIZE));
  const skip = (page - 1) * limit;

  const where: { tenantId: string; status?: string; teamId?: string } = { tenantId };
  if (params.status) where.status = params.status;
  if (params.teamId) where.teamId = params.teamId;

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { items: true, team: { select: { id: true, name: true } } },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  } as PaginatedResult<typeof data[0]>;
}

export async function getOrderById(tenantId: string, orderId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: { items: true, history: true, team: true },
  });
}

export async function transitionOrderStatus(
  tenantId: string,
  orderId: string,
  toStatus: OrderStatus,
  note?: string
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: { history: true },
  });
  if (!order) throw new Error('Order not found');

  const allowed = ORDER_STATUS_FLOW[order.status];
  if (!allowed?.includes(toStatus)) {
    throw new Error(`Cannot transition from ${order.status} to ${toStatus}`);
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: toStatus },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus,
        note,
      },
    }),
  ]);

  return getOrderById(tenantId, orderId);
}
