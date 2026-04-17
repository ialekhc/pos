import { Prisma, PrismaClient, SubscriptionStatus, SupportTier, TenantStatus, UserRoleCode } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type PlanSeed = {
  code: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxProducts: number;
  maxOrdersPerYear: number;
  maxStaffAccounts: number;
  domainIncluded: boolean;
  hostingPackage: string;
  maintenanceIncluded: boolean;
  supportTier: SupportTier;
  metadata: Record<string, unknown>;
  features: Array<{ key: string; enabled: boolean; limitValue?: number }>;
};

const features = [
  { key: 'BASIC_POS', name: 'Basic POS', category: 'pos', isMetered: false },
  { key: 'STAFF_MANAGEMENT', name: 'Staff Management', category: 'staff', isMetered: true, defaultLimit: 2 },
  { key: 'STOCK_ALERTS', name: 'Stock Alerts', category: 'inventory', isMetered: false },
  { key: 'DIGITAL_PAYMENT', name: 'Digital Payment Support', category: 'payments', isMetered: false },
  { key: 'ADVANCED_ANALYTICS', name: 'Advanced Analytics', category: 'reports', isMetered: false },
  { key: 'SPLIT_PAYMENT', name: 'Split Payment', category: 'payments', isMetered: false },
  { key: 'MULTI_COUNTER', name: 'Multi Counter', category: 'operations', isMetered: true, defaultLimit: 1 },
  { key: 'ADVANCED_INVENTORY', name: 'Advanced Inventory', category: 'inventory', isMetered: false },
  { key: 'INTEGRATION_ACCESS', name: 'Integrations', category: 'integrations', isMetered: false },
  { key: 'MULTI_BRANCH', name: 'Multi Branch', category: 'operations', isMetered: true, defaultLimit: 1 },
  { key: 'API_ACCESS', name: 'API Access', category: 'platform', isMetered: false },
  { key: 'PREMIUM_SUPPORT', name: 'Premium Support', category: 'support', isMetered: false },
  { key: 'CUSTOM_PAYMENT_INTEGRATION', name: 'Custom Payment Integration', category: 'payments', isMetered: false }
];

const plans: PlanSeed[] = [
  {
    code: 'STARTUP',
    name: 'Startup',
    description: 'Entry plan for new businesses with essential POS capabilities.',
    monthlyPrice: 19,
    yearlyPrice: 190,
    maxProducts: 250,
    maxOrdersPerYear: 10000,
    maxStaffAccounts: 3,
    domainIncluded: true,
    hostingPackage: 'Basic Shared Cloud',
    maintenanceIncluded: true,
    supportTier: SupportTier.BASIC,
    metadata: {
      packageSummary: 'Basic POS, domain, maintenance, manual or basic digital payment recording',
      hosting: 'Shared',
      domain: 'Included',
      maintenance: 'Standard'
    },
    features: [
      { key: 'BASIC_POS', enabled: true },
      { key: 'STAFF_MANAGEMENT', enabled: true, limitValue: 3 },
      { key: 'STOCK_ALERTS', enabled: true },
      { key: 'DIGITAL_PAYMENT', enabled: true },
      { key: 'ADVANCED_ANALYTICS', enabled: false },
      { key: 'SPLIT_PAYMENT', enabled: false },
      { key: 'MULTI_COUNTER', enabled: false, limitValue: 1 },
      { key: 'ADVANCED_INVENTORY', enabled: false },
      { key: 'INTEGRATION_ACCESS', enabled: false },
      { key: 'MULTI_BRANCH', enabled: false, limitValue: 1 },
      { key: 'API_ACCESS', enabled: false },
      { key: 'PREMIUM_SUPPORT', enabled: false },
      { key: 'CUSTOM_PAYMENT_INTEGRATION', enabled: false }
    ]
  },
  {
    code: 'BRONZE',
    name: 'Bronze',
    description: 'Growing operations with core team and stock alerting.',
    monthlyPrice: 49,
    yearlyPrice: 490,
    maxProducts: 1000,
    maxOrdersPerYear: 30000,
    maxStaffAccounts: 10,
    domainIncluded: true,
    hostingPackage: 'Managed Shared Cloud',
    maintenanceIncluded: true,
    supportTier: SupportTier.PRIORITY,
    metadata: {
      packageSummary: 'Staff support, stock alerts, basic digital payment integration',
      hosting: 'Managed Shared',
      domain: 'Included',
      maintenance: 'Priority Fix Window'
    },
    features: [
      { key: 'BASIC_POS', enabled: true },
      { key: 'STAFF_MANAGEMENT', enabled: true, limitValue: 10 },
      { key: 'STOCK_ALERTS', enabled: true },
      { key: 'DIGITAL_PAYMENT', enabled: true },
      { key: 'ADVANCED_ANALYTICS', enabled: false },
      { key: 'SPLIT_PAYMENT', enabled: false },
      { key: 'MULTI_COUNTER', enabled: true, limitValue: 2 },
      { key: 'ADVANCED_INVENTORY', enabled: false },
      { key: 'INTEGRATION_ACCESS', enabled: false },
      { key: 'MULTI_BRANCH', enabled: false, limitValue: 1 },
      { key: 'API_ACCESS', enabled: false },
      { key: 'PREMIUM_SUPPORT', enabled: false },
      { key: 'CUSTOM_PAYMENT_INTEGRATION', enabled: false }
    ]
  },
  {
    code: 'SILVER',
    name: 'Silver',
    description: 'Cloud-sync teams with advanced analytics and split payments.',
    monthlyPrice: 99,
    yearlyPrice: 990,
    maxProducts: 5000,
    maxOrdersPerYear: 100000,
    maxStaffAccounts: 30,
    domainIncluded: true,
    hostingPackage: 'Dedicated Resource Pool',
    maintenanceIncluded: true,
    supportTier: SupportTier.PRIORITY,
    metadata: {
      packageSummary: 'Cloud sync, advanced analytics, split payment and rich payment reporting',
      hosting: 'Dedicated Pool',
      domain: 'Included',
      maintenance: 'Proactive Monitoring'
    },
    features: [
      { key: 'BASIC_POS', enabled: true },
      { key: 'STAFF_MANAGEMENT', enabled: true, limitValue: 30 },
      { key: 'STOCK_ALERTS', enabled: true },
      { key: 'DIGITAL_PAYMENT', enabled: true },
      { key: 'ADVANCED_ANALYTICS', enabled: true },
      { key: 'SPLIT_PAYMENT', enabled: true },
      { key: 'MULTI_COUNTER', enabled: true, limitValue: 5 },
      { key: 'ADVANCED_INVENTORY', enabled: true },
      { key: 'INTEGRATION_ACCESS', enabled: true },
      { key: 'MULTI_BRANCH', enabled: false, limitValue: 1 },
      { key: 'API_ACCESS', enabled: false },
      { key: 'PREMIUM_SUPPORT', enabled: true },
      { key: 'CUSTOM_PAYMENT_INTEGRATION', enabled: false }
    ]
  },
  {
    code: 'GOLD',
    name: 'Gold',
    description: 'Advanced inventory, multi-counter and integration support.',
    monthlyPrice: 199,
    yearlyPrice: 1990,
    maxProducts: 15000,
    maxOrdersPerYear: 250000,
    maxStaffAccounts: 80,
    domainIncluded: true,
    hostingPackage: 'High Availability Cluster',
    maintenanceIncluded: true,
    supportTier: SupportTier.PREMIUM,
    metadata: {
      packageSummary: 'Advanced inventory, multi-counter, accounting/payment integrations',
      hosting: 'HA Cluster',
      domain: 'Included',
      maintenance: '24/7 Proactive'
    },
    features: [
      { key: 'BASIC_POS', enabled: true },
      { key: 'STAFF_MANAGEMENT', enabled: true, limitValue: 80 },
      { key: 'STOCK_ALERTS', enabled: true },
      { key: 'DIGITAL_PAYMENT', enabled: true },
      { key: 'ADVANCED_ANALYTICS', enabled: true },
      { key: 'SPLIT_PAYMENT', enabled: true },
      { key: 'MULTI_COUNTER', enabled: true, limitValue: 12 },
      { key: 'ADVANCED_INVENTORY', enabled: true },
      { key: 'INTEGRATION_ACCESS', enabled: true },
      { key: 'MULTI_BRANCH', enabled: true, limitValue: 5 },
      { key: 'API_ACCESS', enabled: true },
      { key: 'PREMIUM_SUPPORT', enabled: true },
      { key: 'CUSTOM_PAYMENT_INTEGRATION', enabled: true }
    ]
  },
  {
    code: 'DIAMOND',
    name: 'Diamond',
    description: 'Enterprise-grade unlimited scale with custom integrations.',
    monthlyPrice: 499,
    yearlyPrice: 4990,
    maxProducts: 1000000,
    maxOrdersPerYear: 5000000,
    maxStaffAccounts: 10000,
    domainIncluded: true,
    hostingPackage: 'Enterprise Dedicated',
    maintenanceIncluded: true,
    supportTier: SupportTier.ENTERPRISE,
    metadata: {
      packageSummary: 'Unlimited scale, multi-branch, API, custom payment integrations, enterprise reporting',
      hosting: 'Dedicated Enterprise',
      domain: 'Included + BYOD',
      maintenance: 'Dedicated Success Team'
    },
    features: [
      { key: 'BASIC_POS', enabled: true },
      { key: 'STAFF_MANAGEMENT', enabled: true, limitValue: 10000 },
      { key: 'STOCK_ALERTS', enabled: true },
      { key: 'DIGITAL_PAYMENT', enabled: true },
      { key: 'ADVANCED_ANALYTICS', enabled: true },
      { key: 'SPLIT_PAYMENT', enabled: true },
      { key: 'MULTI_COUNTER', enabled: true, limitValue: 999 },
      { key: 'ADVANCED_INVENTORY', enabled: true },
      { key: 'INTEGRATION_ACCESS', enabled: true },
      { key: 'MULTI_BRANCH', enabled: true, limitValue: 999 },
      { key: 'API_ACCESS', enabled: true },
      { key: 'PREMIUM_SUPPORT', enabled: true },
      { key: 'CUSTOM_PAYMENT_INTEGRATION', enabled: true }
    ]
  }
];

async function seedPlansAndFeatures() {
  const featureMap = new Map<string, { id: string }>();

  for (const feature of features) {
    const row = await prisma.feature.upsert({
      where: { key: feature.key },
      update: {
        name: feature.name,
        category: feature.category,
        isMetered: feature.isMetered,
        defaultLimit: feature.defaultLimit
      },
      create: feature
    });
    featureMap.set(feature.key, { id: row.id });
  }

  const planMap = new Map<string, { id: string }>();

  for (const plan of plans) {
    const planRecord = await prisma.plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        monthlyPrice: new Prisma.Decimal(plan.monthlyPrice),
        yearlyPrice: new Prisma.Decimal(plan.yearlyPrice),
        maxProducts: plan.maxProducts,
        maxOrdersPerYear: plan.maxOrdersPerYear,
        maxStaffAccounts: plan.maxStaffAccounts,
        domainIncluded: plan.domainIncluded,
        hostingPackage: plan.hostingPackage,
        maintenanceIncluded: plan.maintenanceIncluded,
        supportTier: plan.supportTier,
        metadata: plan.metadata as Prisma.InputJsonValue
      },
      create: {
        code: plan.code,
        name: plan.name,
        description: plan.description,
        monthlyPrice: new Prisma.Decimal(plan.monthlyPrice),
        yearlyPrice: new Prisma.Decimal(plan.yearlyPrice),
        maxProducts: plan.maxProducts,
        maxOrdersPerYear: plan.maxOrdersPerYear,
        maxStaffAccounts: plan.maxStaffAccounts,
        domainIncluded: plan.domainIncluded,
        hostingPackage: plan.hostingPackage,
        maintenanceIncluded: plan.maintenanceIncluded,
        supportTier: plan.supportTier,
        metadata: plan.metadata as Prisma.InputJsonValue
      }
    });

    planMap.set(plan.code, { id: planRecord.id });

    for (const entitlement of plan.features) {
      const feature = featureMap.get(entitlement.key);
      if (!feature) {
        continue;
      }

      await prisma.planFeature.upsert({
        where: {
          planId_featureId: {
            planId: planRecord.id,
            featureId: feature.id
          }
        },
        update: {
          enabled: entitlement.enabled,
          limitValue: entitlement.limitValue
        },
        create: {
          planId: planRecord.id,
          featureId: feature.id,
          enabled: entitlement.enabled,
          limitValue: entitlement.limitValue
        }
      });
    }
  }

  return planMap;
}

async function seedRoles() {
  const existing = await prisma.role.findFirst({
    where: {
      tenantId: null,
      code: UserRoleCode.SUPER_ADMIN
    }
  });

  const globalRole = existing
    ? await prisma.role.update({
        where: { id: existing.id },
        data: {
          name: 'Super Admin',
          permissions: {
            scope: 'platform',
            all: true
          }
        }
      })
    : await prisma.role.create({
        data: {
          tenantId: null,
          code: UserRoleCode.SUPER_ADMIN,
          name: 'Super Admin',
          permissions: {
            scope: 'platform',
            all: true
          }
        }
      });

  return { globalRole };
}

async function seedSuperAdmin(globalRoleId: string) {
  const email = process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@platform.local';
  const password = process.env.SUPER_ADMIN_PASSWORD ?? 'SuperSecure123!';
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      roleId: globalRoleId,
      firstName: 'Platform',
      lastName: 'Owner',
      passwordHash,
      isActive: true,
      tenantId: null
    },
    create: {
      email,
      passwordHash,
      roleId: globalRoleId,
      firstName: 'Platform',
      lastName: 'Owner',
      isActive: true,
      tenantId: null
    }
  });
}

async function seedTenantData(planMap: Map<string, { id: string }>) {
  const tenants = [
    {
      name: 'Sunrise Mart',
      slug: 'sunrise-mart',
      planCode: 'SILVER',
      timezone: 'Asia/Kolkata',
      currency: 'INR'
    },
    {
      name: 'Metro Retail Hub',
      slug: 'metro-retail-hub',
      planCode: 'GOLD',
      timezone: 'Australia/Sydney',
      currency: 'AUD'
    }
  ];

  for (const tenantSeed of tenants) {
    const tenant = await prisma.tenant.upsert({
      where: { slug: tenantSeed.slug },
      update: {
        name: tenantSeed.name,
        status: TenantStatus.ACTIVE,
        timezone: tenantSeed.timezone,
        currency: tenantSeed.currency
      },
      create: {
        name: tenantSeed.name,
        slug: tenantSeed.slug,
        status: TenantStatus.ACTIVE,
        timezone: tenantSeed.timezone,
        currency: tenantSeed.currency
      }
    });

    const roles = {
      admin: await prisma.role.upsert({
        where: {
          tenantId_code: {
            tenantId: tenant.id,
            code: UserRoleCode.TENANT_ADMIN
          }
        },
        update: { name: 'Tenant Admin' },
        create: {
          tenantId: tenant.id,
          code: UserRoleCode.TENANT_ADMIN,
          name: 'Tenant Admin',
          permissions: { modules: ['*'] }
        }
      }),
      manager: await prisma.role.upsert({
        where: {
          tenantId_code: {
            tenantId: tenant.id,
            code: UserRoleCode.MANAGER
          }
        },
        update: { name: 'Manager' },
        create: {
          tenantId: tenant.id,
          code: UserRoleCode.MANAGER,
          name: 'Manager',
          permissions: {
            modules: ['dashboard', 'inventory', 'sales', 'reports', 'refund']
          }
        }
      }),
      cashier: await prisma.role.upsert({
        where: {
          tenantId_code: {
            tenantId: tenant.id,
            code: UserRoleCode.CASHIER
          }
        },
        update: { name: 'Cashier' },
        create: {
          tenantId: tenant.id,
          code: UserRoleCode.CASHIER,
          name: 'Cashier',
          permissions: {
            modules: ['pos', 'sales:create']
          }
        }
      })
    };

    const defaultPasswordHash = await bcrypt.hash('Password@123', 12);

    const adminUser = await prisma.user.upsert({
      where: { email: `admin@${tenant.slug}.local` },
      update: {
        tenantId: tenant.id,
        roleId: roles.admin.id,
        firstName: tenant.name.split(' ')[0],
        lastName: 'Admin',
        passwordHash: defaultPasswordHash,
        isActive: true
      },
      create: {
        tenantId: tenant.id,
        roleId: roles.admin.id,
        email: `admin@${tenant.slug}.local`,
        firstName: tenant.name.split(' ')[0],
        lastName: 'Admin',
        passwordHash: defaultPasswordHash,
        isActive: true
      }
    });

    await prisma.user.upsert({
      where: { email: `manager@${tenant.slug}.local` },
      update: {
        tenantId: tenant.id,
        roleId: roles.manager.id,
        firstName: 'Store',
        lastName: 'Manager',
        passwordHash: defaultPasswordHash,
        isActive: true
      },
      create: {
        tenantId: tenant.id,
        roleId: roles.manager.id,
        email: `manager@${tenant.slug}.local`,
        firstName: 'Store',
        lastName: 'Manager',
        passwordHash: defaultPasswordHash,
        isActive: true
      }
    });

    const cashierUser = await prisma.user.upsert({
      where: { email: `cashier@${tenant.slug}.local` },
      update: {
        tenantId: tenant.id,
        roleId: roles.cashier.id,
        firstName: 'Front',
        lastName: 'Cashier',
        passwordHash: defaultPasswordHash,
        isActive: true
      },
      create: {
        tenantId: tenant.id,
        roleId: roles.cashier.id,
        email: `cashier@${tenant.slug}.local`,
        firstName: 'Front',
        lastName: 'Cashier',
        passwordHash: defaultPasswordHash,
        isActive: true
      }
    });

    await prisma.subscription.deleteMany({ where: { tenantId: tenant.id } });

    await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: planMap.get(tenantSeed.planCode)!.id,
        status: SubscriptionStatus.ACTIVE,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
        autoRenew: true
      }
    });

    await prisma.setting.upsert({
      where: { tenantId: tenant.id },
      update: {
        businessName: tenant.name,
        currency: tenant.currency,
        timezone: tenant.timezone,
        taxRate: new Prisma.Decimal(5)
      },
      create: {
        tenantId: tenant.id,
        businessName: tenant.name,
        currency: tenant.currency,
        timezone: tenant.timezone,
        taxRate: new Prisma.Decimal(5),
        paymentConfig: {
          cash: true,
          card: true,
          qr: true,
          wallet: true,
          manual: true
        }
      }
    });

    const beverages = await prisma.category.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: 'Beverages' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Beverages'
      }
    });

    const snacks = await prisma.category.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: 'Snacks' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Snacks'
      }
    });

    const cola = await prisma.product.upsert({
      where: {
        tenantId_sku: {
          tenantId: tenant.id,
          sku: 'COLA-500'
        }
      },
      update: {
        stockQuantity: 120,
        price: new Prisma.Decimal(2.5),
        costPrice: new Prisma.Decimal(1.2)
      },
      create: {
        tenantId: tenant.id,
        categoryId: beverages.id,
        name: 'Cola 500ml',
        sku: 'COLA-500',
        barcode: `BC-${tenant.slug}-COLA-500`,
        price: new Prisma.Decimal(2.5),
        costPrice: new Prisma.Decimal(1.2),
        stockQuantity: 120,
        lowStockThreshold: 20
      }
    });

    const chips = await prisma.product.upsert({
      where: {
        tenantId_sku: {
          tenantId: tenant.id,
          sku: 'CHIPS-50'
        }
      },
      update: {
        stockQuantity: 90,
        price: new Prisma.Decimal(1.8),
        costPrice: new Prisma.Decimal(0.9)
      },
      create: {
        tenantId: tenant.id,
        categoryId: snacks.id,
        name: 'Potato Chips 50g',
        sku: 'CHIPS-50',
        barcode: `BC-${tenant.slug}-CHIPS-50`,
        price: new Prisma.Decimal(1.8),
        costPrice: new Prisma.Decimal(0.9),
        stockQuantity: 90,
        lowStockThreshold: 15
      }
    });

    const hasInventorySeedLogs = await prisma.inventoryLog.count({
      where: {
        tenantId: tenant.id,
        reason: 'Initial stock seed'
      }
    });

    if (!hasInventorySeedLogs) {
      await prisma.inventoryLog.createMany({
        data: [
          {
            tenantId: tenant.id,
            productId: cola.id,
            action: 'STOCK_IN',
            quantity: 120,
            previousQuantity: 0,
            newQuantity: 120,
            reason: 'Initial stock seed',
            createdById: adminUser.id
          },
          {
            tenantId: tenant.id,
            productId: chips.id,
            action: 'STOCK_IN',
            quantity: 90,
            previousQuantity: 0,
            newQuantity: 90,
            reason: 'Initial stock seed',
            createdById: adminUser.id
          }
        ]
      });
    }

    const demoSaleNumber = `${tenant.slug.toUpperCase()}-0001`;
    const existingSale = await prisma.sale.findUnique({
      where: {
        tenantId_saleNumber: {
          tenantId: tenant.id,
          saleNumber: demoSaleNumber
        }
      }
    });

    const sale =
      existingSale ??
      (await prisma.sale.create({
        data: {
          tenantId: tenant.id,
          saleNumber: demoSaleNumber,
          source: 'POS',
          status: 'COMPLETED',
          subtotal: new Prisma.Decimal(6.8),
          discountAmount: new Prisma.Decimal(0),
          taxAmount: new Prisma.Decimal(0.34),
          totalAmount: new Prisma.Decimal(7.14),
          paidAmount: new Prisma.Decimal(7.14),
          changeAmount: new Prisma.Decimal(0),
          cashierId: cashierUser.id,
          completedAt: new Date(),
          items: {
            create: [
              {
                productId: cola.id,
                productName: cola.name,
                sku: cola.sku,
                quantity: 2,
                unitPrice: new Prisma.Decimal(2.5),
                costPrice: new Prisma.Decimal(1.2),
                taxAmount: new Prisma.Decimal(0.25),
                lineTotal: new Prisma.Decimal(5.25)
              },
              {
                productId: chips.id,
                productName: chips.name,
                sku: chips.sku,
                quantity: 1,
                unitPrice: new Prisma.Decimal(1.8),
                costPrice: new Prisma.Decimal(0.9),
                taxAmount: new Prisma.Decimal(0.09),
                lineTotal: new Prisma.Decimal(1.89)
              }
            ]
          }
        }
      }));

    const paymentReference = `PAY-${tenant.slug.toUpperCase()}-0001`;
    const existingPayment = await prisma.payment.findFirst({
      where: {
        tenantId: tenant.id,
        saleId: sale.id,
        referenceNumber: paymentReference
      }
    });

    const payment =
      existingPayment ??
      (await prisma.payment.create({
        data: {
          tenantId: tenant.id,
          saleId: sale.id,
          method: 'CARD',
          status: 'SUCCESS',
          provider: 'MANUAL_CARD_TERMINAL',
          amount: new Prisma.Decimal(7.14),
          currency: tenant.currency,
          paidAt: new Date(),
          createdById: cashierUser.id,
          referenceNumber: paymentReference
        }
      }));

    const txReference = `TX-${tenant.slug.toUpperCase()}-0001`;
    const existingTx = await prisma.paymentTransaction.findFirst({
      where: {
        tenantId: tenant.id,
        paymentId: payment.id,
        providerTransactionId: txReference
      }
    });

    if (!existingTx) {
      await prisma.paymentTransaction.create({
        data: {
          tenantId: tenant.id,
          paymentId: payment.id,
          provider: 'MANUAL_CARD_TERMINAL',
          providerTransactionId: txReference,
          status: 'SUCCESS',
          amount: new Prisma.Decimal(7.14),
          currency: tenant.currency,
          responsePayload: {
            acknowledged: true,
            source: 'seed'
          },
          reconciledAt: new Date()
        }
      });
    }

    const hasBootstrapAuditLog = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: 'TENANT_BOOTSTRAP_SEEDED',
        entity: 'Tenant',
        entityId: tenant.id
      },
      select: {
        id: true
      }
    });

    if (!hasBootstrapAuditLog) {
      await prisma.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorType: 'SYSTEM',
          action: 'TENANT_BOOTSTRAP_SEEDED',
          entity: 'Tenant',
          entityId: tenant.id,
          details: {
            seededPlan: tenantSeed.planCode
          }
        }
      });
    }
  }
}

async function main() {
  const { globalRole } = await seedRoles();
  await seedSuperAdmin(globalRole.id);
  const planMap = await seedPlansAndFeatures();
  await seedTenantData(planMap);

  console.log('Seed completed successfully.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
