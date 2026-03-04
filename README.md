# Multi-Tenant Enterprise Platform

Production-ready platform for user onboarding, order processing, analytics, third-party integrations, and operations dashboards across multiple teams and regions.

## Features

- **Multi-tenancy**: Tenant isolation with region and team support
- **User onboarding**: Registration, verification, roles, and invitations
- **Order processing**: Full order lifecycle, status workflows, and history
- **Analytics**: Aggregated metrics, reports, and export
- **Third-party integrations**: Webhooks, API keys, and configurable adapters
- **Operations dashboards**: Admin and regional views with RBAC

## Stack

- **API**: Node.js, TypeScript, Express, Prisma
- **Web**: React, TypeScript, Vite
- **Database**: PostgreSQL
- **Cache/Queue**: Redis

## Quick Start

```bash
# Install dependencies
npm install

# Start Postgres and Redis
docker-compose up -d

# Copy env and set DATABASE_URL
cp .env.example .env

# Generate Prisma client and run migrations
npm run db:generate
npm run db:migrate
npm run db:seed

# Run API and Web
npm run dev        # API on http://localhost:3000
npm run dev:web    # Dashboard on http://localhost:5173
```

## Project Structure

```
packages/
  api/          # REST API, auth, business logic
  web/          # React dashboards (admin, regional, team)
  shared/       # Shared types and constants
```

## API Overview

- `POST /api/auth/register` - Register (onboarding)
- `POST /api/auth/login` - Login
- `GET/POST /api/tenants` - Tenant management (admin)
- `GET/POST /api/orders` - Order CRUD (tenant-scoped)
- `GET /api/analytics/*` - Analytics endpoints
- `GET/POST /api/integrations/*` - Webhooks, API keys

Default seed: `admin@platform.com` / `Admin123!` (change in production).

## Tenant-scoped requests

For tenant-scoped endpoints (orders, analytics, integrations), send the tenant context in one of:

- Query: `?tenantId=<uuid>`
- Header: `X-Tenant-ID: <uuid>`
- Body (POST): `"tenantId": "<uuid>"`

The authenticated user must be a member of that tenant.
