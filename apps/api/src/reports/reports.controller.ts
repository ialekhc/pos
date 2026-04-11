import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActiveUser } from '../common/types/active-user.type';
import { ReportRangeDto } from './dto/report-range.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  summary(@CurrentUser() user: ActiveUser, @Query() query: ReportRangeDto) {
    return this.reportsService.summary(user, query);
  }

  @Get('top-products')
  topProducts(@CurrentUser() user: ActiveUser, @Query() query: ReportRangeDto) {
    return this.reportsService.topProducts(user, query);
  }

  @Get('payment-wise')
  paymentWise(@CurrentUser() user: ActiveUser, @Query() query: ReportRangeDto) {
    return this.reportsService.paymentWise(user, query);
  }

  @Get('cashier-wise')
  cashierWise(@CurrentUser() user: ActiveUser, @Query() query: ReportRangeDto) {
    return this.reportsService.cashierWise(user, query);
  }

  @Get('export/csv')
  exportCsv() {
    return this.reportsService.exportCsv();
  }

  @Get('export/pdf')
  exportPdf() {
    return this.reportsService.exportPdf();
  }
}
