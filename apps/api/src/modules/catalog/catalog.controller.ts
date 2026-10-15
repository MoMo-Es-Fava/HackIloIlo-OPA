import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { PriceBasis, PriceItem, Role } from '@irpc/types';
import { IsBoolean, IsIn, IsInt, IsNumberString, IsOptional, IsString, Length, Matches, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { CurrentUser, Public, Roles } from '../../common/auth.decorators';
import type { UserDto } from '@irpc/types';
import { CatalogService } from './catalog.service';

class CreatePriceDto {
  @IsIn(Object.values(PriceItem))
  item!: PriceItem;

  @IsOptional()
  @IsInt()
  @Min(1)
  riceTypeId?: number;

  @IsNumberString()
  pricePerKg!: string;

  @IsIn(Object.values(PriceBasis))
  basis!: PriceBasis;

  @IsBoolean()
  notifyUsers!: boolean;
}

class UpdateStockDto {
  @IsNumberString()
  @Matches(/^-?\d{1,7}(\.\d{1,2})?$/)
  changeKg!: string;

  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(3, 300)
  reason!: string;
}

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Public()
  @Get('prices')
  getPrices() {
    return this.catalog.getPrices();
  }

  @Public()
  @Get('rice-types')
  getRiceTypes() {
    return this.catalog.getRiceTypes();
  }

  @Public()
  @Get('settings')
  getSettings() {
    return this.catalog.getSettings();
  }

  @Roles(Role.ADMIN)
  @Post('admin/prices')
  createPrice(@Body() body: CreatePriceDto, @CurrentUser() user: UserDto) {
    return this.catalog.createPrice({ ...body, createdById: user.id });
  }

  @Roles(Role.ADMIN)
  @Get('admin/prices/history')
  getPriceHistory(@Query('item') item?: PriceItem) {
    if (item && !Object.values(PriceItem).includes(item)) {
      throw new BadRequestException('Invalid price item.');
    }
    return this.catalog.priceHistory(item);
  }

  @Roles(Role.ADMIN)
  @Post('admin/rice-types/:id/stock')
  updateStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateStockDto,
    @CurrentUser() user: UserDto,
  ) {
    return this.catalog.updateStock(id, body.changeKg, body.reason, user.id);
  }
}
