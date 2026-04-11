# Multi-Tenant POS SaaS Architecture

## Monorepo Layout

```text
.
├── apps
│   ├── api
│   │   ├── prisma
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   └── src
│   │       ├── auth
│   │       ├── admin
│   │       ├── audit
│   │       ├── tenants
│   │       ├── plans
│   │       ├── subscriptions
│   │       ├── users
│   │       ├── categories
│   │       ├── products
│   │       ├── inventory
│   │       ├── sales
│   │       ├── payments
│   │       ├── reports
│   │       ├── settings
│   │       ├── realtime
│   │       ├── redis
│   │       ├── database
│   │       └── common
│   └── web
│       └── src
│           ├── app
│           │   ├── (auth)
│           │   ├── (super-admin)
│           │   └── (tenant)
│           ├── components
│           ├── hooks
│           └── lib
├── docs
│   ├── architecture.md
│   └── api-routes.md
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Backend Design

- NestJS modular architecture with clear domain modules.
- Prisma-backed PostgreSQL relational schema.
- JWT authentication with refresh-token rotation support.
- Global RBAC + tenant scope + feature entitlement guards.
- Redis service for caching entitlement checks.
- Socket.IO gateway for stock/sale/dashboard real-time events.
- Payment provider abstraction via `PaymentProvider` interface.
- Service + repository separation per module.

## Multi-Tenancy Model

- Every business entity carries `tenantId`.
- `TenantScopeGuard` blocks cross-tenant access for tenant users.
- Super admin bypass is allowed for platform management.
- Subscription + plan entitlement checks determine access/limits.

## Plan Entitlement Engine

- Feature catalog in `Feature` model.
- Plan-feature mapping in `PlanFeature` model.
- Limits in both `Plan` (hard caps) and `PlanFeature` (feature-level limits).
- `EntitlementsService` reads active subscription and caches in Redis.
- Business services call:
  - `assertFeature(...)`
  - `assertWithinPlanLimit(...)`

## POS Transaction Flow

1. Cashier builds cart (offline-safe local storage).
2. Checkout sends sale request with items + payments.
3. Backend validates plan limits and split-payment eligibility.
4. Stock decremented transactionally, sale + sale items created.
5. Payments processed via provider abstraction.
6. Audit log entry created.
7. Socket events emitted for live dashboards/counters.

## Offline Resilience

- `useOfflineCart` stores current and held carts in browser storage.
- Carts can be held/resumed even with intermittent connectivity.
- Server-side `Cart` entities support hold/resume APIs for shared counters.

## Production-Readiness Notes

- Schema supports soft-delete and audit trails.
- Modules are ready for queue/background job extension.
- Gateway integration is provider-agnostic and reconciliation-ready.
- Export endpoints are placeholder-wired for async CSV/PDF worker pipelines.
