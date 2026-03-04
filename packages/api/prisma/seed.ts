import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Admin123!', 12);

  const platformAdmin = await prisma.user.upsert({
    where: { email: 'admin@platform.com' },
    update: {},
    create: {
      email: 'admin@platform.com',
      passwordHash: hash,
      name: 'Platform Admin',
      emailVerified: true,
      platformRole: 'platform_admin',
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corp',
      slug: 'acme-corp',
      region: 'americas',
    },
  });

  const team = await prisma.team.create({
    data: {
      name: 'Sales Americas',
      tenantId: tenant.id,
      region: 'americas',
    },
  });

  await prisma.tenantUser.upsert({
    where: {
      userId_tenantId: { userId: platformAdmin.id, tenantId: tenant.id },
    },
    update: {},
    create: {
      userId: platformAdmin.id,
      tenantId: tenant.id,
      teamId: team.id,
      role: 'owner',
      joinedAt: new Date(),
    },
  });

  // Sample order
  await prisma.order.create({
    data: {
      tenantId: tenant.id,
      teamId: team.id,
      status: 'confirmed',
      totalCents: 19900,
      currency: 'USD',
      items: {
        create: [
          { sku: 'SKU-001', name: 'Widget A', quantity: 2, unitCents: 9950 },
        ],
      },
      history: {
        create: [
          { fromStatus: null, toStatus: 'draft' },
          { fromStatus: 'draft', toStatus: 'pending' },
          { fromStatus: 'pending', toStatus: 'confirmed' },
        ],
      },
    },
  });

  console.log('Seed done:', { platformAdmin: platformAdmin.email, tenant: tenant.slug });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
