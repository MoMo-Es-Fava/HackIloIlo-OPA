import { Module } from '@nestjs/common';
import { SmsModule } from '../../integrations/textbee/sms.module';
import {
  AdminDashboardController,
  AdminOrdersController,
  OrdersController,
} from './orders.controller';
import { OrdersService } from './orders.service';
import { PricingLookup } from './pricing.lookup';

// PrismaService comes from the global DatabaseModule.
@Module({
  imports: [SmsModule],
  controllers: [
    OrdersController,
    AdminOrdersController,
    AdminDashboardController,
  ],
  providers: [OrdersService, PricingLookup],
})
export class OrdersModule {}
