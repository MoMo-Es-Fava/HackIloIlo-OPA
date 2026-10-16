import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@irpc/types';
import { Roles } from '../../common/auth.decorators';
import { AnalyticsService } from './analytics.service';

@Roles(Role.ADMIN, Role.PLANT_STAFF)
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('operations')
  operations(@Query('days') days?: string) {
    return this.analytics.operations(days);
  }

  @Roles(Role.ADMIN)
  @Get('finance')
  finance(@Query('days') days?: string) {
    return this.analytics.finance(days);
  }

  @Roles(Role.ADMIN)
  @Get('catalog')
  catalog(@Query('days') days?: string) {
    return this.analytics.catalog(days);
  }

  @Get('logs')
  logs(@Query('days') days?: string) {
    return this.analytics.logs(days);
  }
}
