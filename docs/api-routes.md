# REST API Route Map (`/api/v1`)

## Auth
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## Super Admin
- `GET /admin/dashboard`
- `GET /admin/tenants`
- `GET /admin/system/health`
- `POST /admin/tenants/:tenantId/impersonate`

## Tenant Management
- `GET /tenants`
- `GET /tenants/:tenantId`
- `GET /tenants/me`
- `POST /tenants`
- `PATCH /tenants/:tenantId`
- `PATCH /tenants/:tenantId/status/:status`
- `DELETE /tenants/:tenantId`

## Plans and Entitlements
- `GET /plans`
- `GET /plans/features`
- `GET /plans/:planId`
- `GET /plans/entitlements/me`
- `POST /plans`
- `PATCH /plans/:planId`
- `PATCH /plans/:planId/features`

## Subscriptions
- `GET /subscriptions`
- `POST /subscriptions/assign`
- `GET /subscriptions/tenant/:tenantId`
- `GET /subscriptions/me/current`

## Users and Staff
- `GET /users` (supports `?tenantId=...` for super admin views)
- `GET /users/roles` (supports `?tenantId=...` for super admin role targeting)
- `POST /users`
- `PATCH /users/:userId`
- `PATCH /users/:userId/reset-password`
- `DELETE /users/:userId`

## Categories
- `GET /categories`
- `POST /categories`
- `PATCH /categories/:categoryId`
- `DELETE /categories/:categoryId`

## Products
- `GET /products`
- `GET /products/low-stock`
- `POST /products`
- `PATCH /products/:productId`
- `DELETE /products/:productId`

## Inventory
- `POST /inventory/adjust`
- `GET /inventory/logs`

## Sales / POS
- `GET /sales` (`?take=15` optional, max 100)
- `GET /sales/:saleId`
- `POST /sales`
- `POST /sales/refund`
- `PATCH /sales/:saleId/cancel`
- `POST /sales/carts/hold`
- `GET /sales/carts/held/list`
- `PATCH /sales/carts/:cartId/resume`
- `DELETE /sales/carts/:cartId`

## Payments
- `GET /payments`
- `POST /payments/record`
- `POST /payments/reconcile`

## Reports
- `GET /reports/summary`
- `GET /reports/top-products`
- `GET /reports/payment-wise`
- `GET /reports/cashier-wise`
- `GET /reports/export/csv`
- `GET /reports/export/pdf`

## Settings
- `GET /settings`
- `PATCH /settings`

## Audit
- `GET /audit`
