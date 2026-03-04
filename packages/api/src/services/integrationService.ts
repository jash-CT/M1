import crypto from 'crypto';
import { prisma } from '../db';
import type { IntegrationType } from '@enterprise-platform/shared';

export interface CreateIntegrationInput {
  tenantId: string;
  type: IntegrationType;
  name: string;
  config: Record<string, unknown>;
  secret?: string;
}

function generateSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createIntegration(input: CreateIntegrationInput) {
  const secret = input.secret ?? (input.type === 'api_key' ? generateSecret() : undefined);
  return prisma.integration.create({
    data: {
      tenantId: input.tenantId,
      type: input.type,
      name: input.name,
      config: input.config as object,
      secret,
    },
  });
}

export async function listIntegrations(tenantId: string) {
  return prisma.integration.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      type: true,
      name: true,
      config: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      // never expose secret in list
    },
  });
}

export async function getIntegrationById(tenantId: string, id: string) {
  return prisma.integration.findFirst({
    where: { id, tenantId },
  });
}

export async function validateApiKey(tenantId: string, key: string): Promise<boolean> {
  const integration = await prisma.integration.findFirst({
    where: { tenantId, type: 'api_key', isActive: true },
  });
  if (!integration?.secret) return false;
  return crypto.timingSafeEqual(Buffer.from(integration.secret, 'hex'), Buffer.from(key, 'hex'));
}

export async function deactivateIntegration(tenantId: string, id: string) {
  return prisma.integration.updateMany({
    where: { id, tenantId },
    data: { isActive: false },
  });
}
