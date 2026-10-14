import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { PriceBasis, PriceItem } from '@irpc/types';
import type { NewPrice } from './prices.repository';
import { PricesRepository } from './prices.repository';
import { PricesAdminGuard } from './prices.guard';

function parsePrice(body: unknown): NewPrice {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('A price object is required');
  }
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some((key) => !['item', 'riceTypeId', 'pricePerKg', 'basis', 'notifyUsers'].includes(key))) {
    throw new BadRequestException('Unknown price field');
  }
  if (!Object.values(PriceItem).includes(input.item as PriceItem)) {
    throw new BadRequestException('Invalid price item');
  }
  if (!Object.values(PriceBasis).includes(input.basis as PriceBasis)) {
    throw new BadRequestException('Invalid price basis');
  }
  if (input.notifyUsers !== undefined && typeof input.notifyUsers !== 'boolean') {
    throw new BadRequestException('notifyUsers must be a boolean');
  }
  // Bound the decimal to ten integer digits and two fractional digits.
  if (typeof input.pricePerKg !== 'string' || !/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(input.pricePerKg)
    || !/[1-9]/.test(input.pricePerKg)) {
    throw new BadRequestException('pricePerKg must be a positive decimal string with at most two decimal places');
  }
  const item = input.item as PriceItem;
  if (item === PriceItem.RICE) {
    if (!Number.isSafeInteger(input.riceTypeId) || (input.riceTypeId as number) <= 0) {
      throw new BadRequestException('A positive integer riceTypeId is required for RICE');
    }
  } else if (input.riceTypeId != null) {
    throw new BadRequestException('riceTypeId is only allowed for RICE');
  }
  if (input.notifyUsers === true) {
    throw new ServiceUnavailableException('Price notifications are not connected; use notifyUsers: false');
  }
  return {
    item,
    pricePerKg: input.pricePerKg,
    basis: input.basis as PriceBasis,
    riceTypeId: item === PriceItem.RICE ? input.riceTypeId as number : null,
  };
}

@Controller()
export class PricesController {
  constructor(@Inject(PricesRepository) private readonly prices: PricesRepository) {}

  @Get('prices')
  getPrices() {
    return this.prices.listCurrentPrices();
  }

  @Get('rice-types')
  getRiceTypes() {
    return this.prices.listRiceTypes();
  }

  @Post('admin/prices')
  @UseGuards(PricesAdminGuard)
  async createPrice(@Body() body: unknown) {
    const price = parsePrice(body);
    if (price.riceTypeId) {
      const types = await this.prices.listRiceTypes();
      if (!types.some((type) => type.id === price.riceTypeId)) {
        throw new NotFoundException('Rice type not found');
      }
    }
    return this.prices.insertPrice(price);
  }
}
