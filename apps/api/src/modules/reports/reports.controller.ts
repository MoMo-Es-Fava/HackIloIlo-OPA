import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../common/auth.decorators';
import { ReportsService } from './reports.service';

@Controller('admin/report')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  // Money is admin-only, same as GET /admin/money.
  @Roles('ADMIN')
  @Get()
  report(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reports.report(from, to);
  }
}
