# Multi-Vendor POS SaaS Platform (Next.js + NestJS)

Production-minded monorepo for a web-based multi-vendor POS SaaS platform with:

- Super Admin control plane
- Vendor workspaces (owner/manager/cashier)
- Plan-based feature entitlement and usage limits
- Real-time sync (Socket.IO)
- Redis-backed caching support
- PostgreSQL relational data model
- Offline-safe POS cart storage on web client

## Tech Stack

- Frontend: Next.js 16, React 19, Tailwind CSS, shadcn/ui-style components
- Backend: NestJS 11, JWT auth, RBAC, vendor guards
- Database: PostgreSQL (Prisma ORM)
- Cache/Session support: Redis
- Real-time: Socket.IO

## Key Capabilities

- Multi-vendor architecture with vendor-scoped data access
- Role system: `SUPER_ADMIN`, `TENANT_ADMIN`, `MANAGER`, `CASHIER`
- Plan/feature system: `STARTUP`, `BRONZE`, `SILVER`, `GOLD`, `DIAMOND`
- Plan limit enforcement for staff, products, and yearly orders
- Payment provider abstraction (`PaymentProvider` interface + manual provider)
- POS flow: product select, cart, hold/resume, checkout, refund/cancel
- Inventory flow: stock in/out/adjustments with log history
- Reporting: daily/weekly/monthly summary, payment-wise, cashier-wise, top products
- Audit log structure for accountability and support operations

## Repository Structure

See [Architecture Docs](./docs/architecture.md) for full breakdown.

## Database Schema

Prisma schema is in:

- `apps/api/prisma/schema.prisma`

It includes:

- `tenants`, `plans`, `features`, `plan_features`, `subscriptions`
- `users`, `roles`
- `products`, `categories`, `inventory_logs`
- `carts`, `cart_items`
- `sales`, `sale_items`
- `payments`, `payment_transactions`
- `settings`, `report_snapshots`, `audit_logs`

## API Route Documentation

Complete route map:

- [API Routes](./docs/api-routes.md)

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker / Docker Compose

## Environment Setup

1. Copy env templates:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

2. Start PostgreSQL + Redis:

```bash
docker compose up -d
```

## Install and Run

```bash
pnpm install
pnpm --filter @pos/api prisma:generate
pnpm --filter @pos/api prisma:migrate
pnpm --filter @pos/api prisma:seed
pnpm dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:3001/api/v1`

## Demo Credentials

Super Admin:

- Email: `superadmin@platform.local`
- Password: `SuperSecure123!`

Vendor users (seeded):

- `admin@sunrise-mart.local` / `Password@123`
- `manager@sunrise-mart.local` / `Password@123`
- `cashier@sunrise-mart.local` / `Password@123`
- `admin@metro-retail-hub.local` / `Password@123`

## Real-Time Events

Socket namespace: `/sync`

Events emitted:

- `inventory.updated`
- `sale.created`
- `dashboard.metrics`

## Payment Architecture

Payment logic is provider-agnostic:

- Interface: `apps/api/src/payments/providers/payment-provider.interface.ts`
- Current provider: manual placeholder implementation
- Future providers (Stripe/Razorpay/etc.) can be plugged through `PaymentProviderFactory`

## Notes for Production Deployment

- Move secrets to managed secret store (no plaintext env in CI)
- Use managed PostgreSQL + Redis with backups
- Add worker queue for CSV/PDF exports and reconciliation jobs
- Add rate limiting + WAF + API monitoring
- Add centralized logs/traces and alerting
- Use separate JWT secrets per environment and rotate periodically

## Managed Data Services

You can use managed services for production-like environments:

- Neon (PostgreSQL)
- Upstash (Redis)

### 1) Create managed data services

- Create a Neon Postgres database and copy `DATABASE_URL`
- Create an Upstash Redis database and copy `REDIS_URL`

### 2) Prepare production schema + seed once

Run from your machine (this seeds your cloud DB):

```bash
DATABASE_URL="<your-neon-url>" pnpm --filter @pos/api prisma:migrate
DATABASE_URL="<your-neon-url>" REDIS_URL="<your-upstash-url>" pnpm --filter @pos/api prisma:seed
```

### 3) Login

- Super admin email: `superadmin@platform.local`
- Super admin password: your `SUPER_ADMIN_PASSWORD` value
