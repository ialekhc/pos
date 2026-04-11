export type UserRole = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'MANAGER' | 'CASHIER';

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string | null;
  tenantSlug: string | null;
  tenantName?: string | null;
};

export type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  price: string;
  costPrice: string;
  stockQuantity: number;
  lowStockThreshold: number;
  status: 'ACTIVE' | 'INACTIVE';
};

export type SalePaymentInput = {
  method: 'CASH' | 'CARD' | 'QR' | 'WALLET' | 'MANUAL';
  amount: number;
};
