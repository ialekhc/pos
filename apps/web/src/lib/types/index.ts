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

export type PaymentMethod = 'CASH' | 'CARD' | 'QR' | 'WALLET' | 'MANUAL';

export type SalePaymentInput = {
  method: PaymentMethod;
  amount: number;
};

export type PosSaleItem = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  discountAmount: string;
  taxAmount: string;
  lineTotal: string;
};

export type PosPayment = {
  id: string;
  method: PaymentMethod;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'PARTIAL';
  provider: string;
  amount: string;
  currency: string;
  referenceNumber?: string | null;
  paidAt?: string | null;
};

export type PosSale = {
  id: string;
  saleNumber: string;
  status: 'COMPLETED' | 'REFUNDED' | 'CANCELED';
  source: 'POS' | 'WEB' | 'API';
  customerName?: string | null;
  customerPhone?: string | null;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  paidAmount: string;
  changeAmount: string;
  notes?: string | null;
  completedAt: string;
  createdAt: string;
  items: PosSaleItem[];
  payments: PosPayment[];
  cashier?: { firstName?: string | null; lastName?: string | null } | null;
};
