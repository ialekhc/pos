import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async getDashboardOverview() {
    const [
      totalTenants,
      activeTenants,
      inactiveTenants,
      totalUsers,
      planDistribution,
      subscriptionStatus,
      revenueSummary,
      recentTenantActivity
    ] = await Promise.all([
      this.prisma.tenant.count({ where: { deletedAt: null } }),
      this.prisma.tenant.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.tenant.count({ where: { status: { in: ['INACTIVE', 'SUSPENDED'] }, deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.subscription.groupBy({
        by: ['planId'],
        _count: { _all: true }
      }),
      this.prisma.subscription.groupBy({
        by: ['status'],
        _count: { _all: true }
      }),
      this.prisma.sale.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { totalAmount: true },
        _count: { _all: true }
      }),
      this.prisma.auditLog.findMany({
        where: {
          action: {
            in: ['TENANT_CREATED', 'TENANT_STATUS_UPDATED', 'TENANT_DEACTIVATED']
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    const plans = await this.prisma.plan.findMany({
      where: { id: { in: planDistribution.map((item) => item.planId) } },
      select: { id: true, code: true, name: true }
    });
    const plansMap = new Map(plans.map((plan) => [plan.id, plan]));

    return {
      metrics: {
        totalTenants,
        activeTenants,
        inactiveTenants,
        totalUsers,
        totalRevenue: Number(revenueSummary._sum.totalAmount ?? 0),
        totalOrders: revenueSummary._count._all
      },
      planDistribution: planDistribution.map((item) => ({
        planId: item.planId,
        planCode: plansMap.get(item.planId)?.code ?? 'UNKNOWN',
        planName: plansMap.get(item.planId)?.name ?? 'Unknown Plan',
        count: item._count._all
      })),
      subscriptionStatus,
      recentTenantActivity
    };
  }

  async listTenantsWithSubscriptions() {
    return this.prisma.tenant.findMany({
      where: { deletedAt: null },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        users: {
          where: { deletedAt: null },
          select: { id: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async systemHealth() {
    const redisStatus = await this.redis.ping().catch(() => 'DOWN');
    const dbStatus = await this.prisma.$queryRaw`SELECT 1`
      .then(() => 'UP')
      .catch(() => 'DOWN');

    return {
      database: dbStatus,
      redis: redisStatus === 'PONG' ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString()
    };
  }

  async createImpersonationToken(tenantId: string, superAdminId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const adminUser = await this.prisma.user.findFirst({
      where: {
        tenantId,
        role: { code: 'TENANT_ADMIN' },
        isActive: true,
        deletedAt: null
      },
      include: {
        role: true
      }
    });

    if (!adminUser) {
      throw new Error('No tenant admin found for impersonation');
    }

    const token = await this.jwtService.signAsync(
      {
        userId: adminUser.id,
        email: adminUser.email,
        tenantId,
        role: adminUser.role.code,
        superAdminImpersonatorId: superAdminId
      },
      {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: '15m'
      }
    );

    return {
      token,
      expiresIn: '15m',
      tenantId,
      tenantName: tenant.name,
      impersonatedUser: {
        userId: adminUser.id,
        email: adminUser.email
      }
    };
  }
}
