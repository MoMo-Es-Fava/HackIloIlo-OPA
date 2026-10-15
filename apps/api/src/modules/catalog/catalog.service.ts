import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CurrentPrice,
  PriceItem as PriceItemType,
  PriceBasis as PriceBasisType,
  PublicSettingsDto,
  RiceTypeDto,
} from '@irpc/types';
import { PriceItem } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';

const DEFAULT_SETTINGS: PublicSettingsDto = {
  dryingRecovery: '0.80',
  millingRecovery: '0.60',
  sackKg: '50',
  dryingCapacityKg: '56000.00',
};

export function priceDto(row: {
  item: PriceItemType;
  riceTypeId: number | null;
  pricePerKg: { toString(): string };
  basis: PriceBasisType;
  effectiveAt: Date;
}): CurrentPrice {
  return {
    item: row.item,
    riceTypeId: row.riceTypeId,
    pricePerKg: row.pricePerKg.toString(),
    basis: row.basis,
    effectiveAt: row.effectiveAt.toISOString(),
  };
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getPrices(): Promise<CurrentPrice[]> {
    const rows = await this.prisma.price.findMany({
      where: { effectiveAt: { lte: new Date() } },
      orderBy: [{ effectiveAt: 'desc' }, { id: 'desc' }],
    });
    const latest = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const key = `${row.item}:${row.riceTypeId ?? 'null'}`;
      if (!latest.has(key)) latest.set(key, row);
    }
    return [...latest.values()].map(priceDto);
  }

  async getRiceTypes(): Promise<RiceTypeDto[]> {
    const [types, prices] = await Promise.all([
      this.prisma.riceType.findMany({
        where: { isActive: true },
        orderBy: { id: 'asc' },
      }),
      this.getPrices(),
    ]);
    return types.map((rice) => ({
      id: rice.id,
      name: rice.name,
      description: rice.description,
      stockKg: rice.stockKg.toString(),
      pricePerKg:
        prices.find(
          (price) =>
            price.item === PriceItem.RICE && price.riceTypeId === rice.id,
        )?.pricePerKg ?? '0.00',
    }));
  }

  async getSettings(): Promise<PublicSettingsDto> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: Object.keys(DEFAULT_SETTINGS) } },
    });
    const values = new Map(rows.map((row) => [row.key, row.value]));
    const setting = (key: keyof PublicSettingsDto) => {
      const value = values.get(key);
      // Settings are stored as JSON; only plain numbers or strings count.
      return typeof value === 'number' || typeof value === 'string'
        ? String(value)
        : DEFAULT_SETTINGS[key];
    };
    return {
      dryingRecovery: setting('dryingRecovery'),
      millingRecovery: setting('millingRecovery'),
      sackKg: setting('sackKg'),
      dryingCapacityKg: setting('dryingCapacityKg'),
    };
  }

  async createPrice(input: {
    item: PriceItemType;
    riceTypeId?: number;
    pricePerKg: string;
    basis: PriceBasisType;
    createdById: number;
  }): Promise<CurrentPrice> {
    const amount = Number(input.pricePerKg);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Enter a price above zero.');
    }
    let riceTypeId: number | null = null;
    if (input.item === PriceItem.RICE) {
      if (!input.riceTypeId)
        throw new BadRequestException('Choose a rice type.');
      const rice = await this.prisma.riceType.findFirst({
        where: { id: input.riceTypeId, isActive: true },
      });
      if (!rice) throw new NotFoundException('Rice type not found.');
      riceTypeId = rice.id;
    }
    const row = await this.prisma.price.create({
      data: {
        item: input.item,
        riceTypeId,
        pricePerKg: amount.toFixed(2),
        basis: input.basis,
        createdById: input.createdById,
      },
    });
    return priceDto(row);
  }

  async priceHistory(item?: PriceItemType): Promise<CurrentPrice[]> {
    const rows = await this.prisma.price.findMany({
      where: item ? { item } : undefined,
      orderBy: [{ effectiveAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map(priceDto);
  }

  async updateStock(
    id: number,
    changeKg: string,
    reason: string,
    actorId: number,
  ) {
    const change = Number(changeKg);
    if (!Number.isFinite(change) || change === 0 || !reason.trim()) {
      throw new BadRequestException(
        'Enter a non-zero stock change and a reason.',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const rice = await tx.riceType.findUnique({ where: { id } });
      if (!rice || !rice.isActive)
        throw new NotFoundException('Rice type not found.');
      const newStock = Number(rice.stockKg) + change;
      if (newStock < 0)
        throw new BadRequestException('Stock cannot be less than zero.');
      await tx.stockAdjustment.create({
        data: {
          riceTypeId: id,
          changeKg: change.toFixed(2),
          reason: reason.trim(),
          actorId,
        },
      });
      const updated = await tx.riceType.update({
        where: { id },
        data: { stockKg: newStock.toFixed(2) },
      });
      const prices = await tx.price.findMany({
        where: {
          item: PriceItem.RICE,
          riceTypeId: id,
          effectiveAt: { lte: new Date() },
        },
        orderBy: [{ effectiveAt: 'desc' }, { id: 'desc' }],
        take: 1,
      });
      return {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        stockKg: updated.stockKg.toString(),
        pricePerKg: prices[0]?.pricePerKg.toString() ?? '0.00',
      } satisfies RiceTypeDto;
    });
  }
}
