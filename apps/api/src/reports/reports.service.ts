import { ForbiddenException, Injectable } from '@nestjs/common';
import { ActiveUser } from '../common/types/active-user.type';
import { EntitlementsService } from '../plans/entitlements.service';
import { ReportRangeDto } from './dto/report-range.dto';
import { ReportsRepository } from './reports.repository';

@Injectable()
export class ReportsService {
  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly entitlementsService: EntitlementsService
  ) {}

  async summary(actor: ActiveUser, query: ReportRangeDto) {
    const tenantId = this.getTenantId(actor);
    const { from, to } = this.getRange(query);

    const summary = await this.reportsRepository.getSalesSummary(tenantId, from, to);
    let paymentBreakdown: Awaited<ReturnType<ReportsRepository['paymentWise']>> = [];

    try {
      paymentBreakdown = await this.reportsRepository.paymentWise(tenantId, from, to);
    } catch {
      paymentBreakdown = [];
    }

    return {
      range: { from, to },
      totals: summary,
      paymentBreakdown
    };
  }

  async topProducts(actor: ActiveUser, query: ReportRangeDto) {
    const tenantId = this.getTenantId(actor);
    await this.entitlementsService.assertFeature(tenantId, 'ADVANCED_ANALYTICS', actor.role);

    const { from, to } = this.getRange(query);
    return this.reportsRepository.topSellingProducts(tenantId, from, to);
  }

  async paymentWise(actor: ActiveUser, query: ReportRangeDto) {
    const tenantId = this.getTenantId(actor);
    const { from, to } = this.getRange(query);

    return this.reportsRepository.paymentWise(tenantId, from, to);
  }

  async cashierWise(actor: ActiveUser, query: ReportRangeDto) {
    const tenantId = this.getTenantId(actor);
    const { from, to } = this.getRange(query);

    const rows = await this.reportsRepository.cashierWise(tenantId, from, to);
    const cashiers = await this.reportsRepository.cashiersByIds(rows.map((row) => row.cashierId));
    const cashierMap = new Map(cashiers.map((cashier) => [cashier.id, cashier]));

    return rows.map((row) => ({
      ...row,
      cashier: cashierMap.get(row.cashierId) ?? null
    }));
  }

  exportCsv() {
    return {
      message:
        'CSV export endpoint placeholder. Wire this to async job + object storage for large enterprise exports.'
    };
  }

  exportPdf() {
    return {
      message:
        'PDF export endpoint placeholder. Generate branded reports using a queue worker and PDF renderer.'
    };
  }

  private getTenantId(actor: ActiveUser) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Vendor context required.');
    }

    return actor.tenantId;
  }

  private getRange(query: ReportRangeDto) {
    if (query.from || query.to) {
      return {
        from: query.from ? new Date(query.from) : new Date(new Date().setDate(new Date().getDate() - 30)),
        to: query.to ? new Date(query.to) : new Date()
      };
    }

    const now = new Date();

    switch (query.period) {
      case 'MONTHLY': {
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from, to: now };
      }
      case 'WEEKLY': {
        const from = new Date(now);
        from.setDate(now.getDate() - 7);
        return { from, to: now };
      }
      case 'DAILY':
      default: {
        const from = new Date(now);
        from.setHours(0, 0, 0, 0);
        return { from, to: now };
      }
    }
  }
}
