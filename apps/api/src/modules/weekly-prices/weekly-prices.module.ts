import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { SmsModule } from '../../integrations/textbee/sms.module';
import { WeeklyPricesService } from './weekly-prices.service';

@Module({
  imports: [CatalogModule, SmsModule],
  providers: [WeeklyPricesService],
  exports: [WeeklyPricesService],
})
export class WeeklyPricesModule {}
