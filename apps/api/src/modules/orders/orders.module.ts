import { Module } from '@nestjs/common';
import { SmsModule } from '../../integrations/textbee/sms.module';
import { CatalogModule } from '../catalog/catalog.module';
import { AdminOrdersController, OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [CatalogModule, SmsModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
