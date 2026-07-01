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

## Local Development

This repository is configured for local development only. PostgreSQL and Redis run in Docker, while the API and web applications run through pnpm.

Start the data services:

```bash
docker compose up -d
```

Prepare the database after the first start or after schema changes:

```bash
pnpm --filter @pos/api prisma:generate
pnpm --filter @pos/api prisma:migrate
pnpm --filter @pos/api prisma:seed
```

Start both applications:

```bash
pnpm dev
```

Open `http://localhost:3000`. The API health endpoint is `http://localhost:3001/api/v1/health`.

Stop local data services when finished:

```bash
docker compose down
```

If port `3000` or `3001` is already in use, stop the existing process before running `pnpm dev` again.
