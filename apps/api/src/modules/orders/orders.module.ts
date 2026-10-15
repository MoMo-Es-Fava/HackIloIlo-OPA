import { Module } from '@nestjs/common';
import { SmsModule } from '../../integrations/textbee/sms.module';
import { AdminOrdersController, OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PricingLookup } from './pricing.lookup';

// PrismaService comes from the global DatabaseModule.
@Module({
  imports: [SmsModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService, PricingLookup],
})
export class OrdersModule {}
