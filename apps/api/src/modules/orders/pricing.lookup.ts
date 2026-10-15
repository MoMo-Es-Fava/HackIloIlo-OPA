import { Injectable } from '@nestjs/common';
import type { CurrentPrice, PublicSettingsDto } from '@irpc/types';
import { PrismaService } from '../../database/prisma.service';

const DEFAULT_SETTINGS: PublicSettingsDto = {
  dryingRecovery: '0.80',
  millingRecovery: '0.60',
  sackKg: '50',
  dryingCapacityKg: '56000',
};

// Reads current prices and settings for orders.
@Injectable()
export class PricingLookup {
  constructor(private readonly prisma: PrismaService) {}

  /** Latest price already in effect for each (item, riceTypeId). */
  async currentPrices(now = new Date()): Promise<CurrentPrice[]> {
    const rows = await this.prisma.price.findMany({
      where: { effectiveAt: { lte: now } },
      orderBy: [{ effectiveAt: 'desc' }, { id: 'desc' }],
    });
    const seen = new Set<string>();
    const current: CurrentPrice[] = [];
    for (const row of rows) {
      const key = `${row.item}:${row.riceTypeId ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      current.push({
        item: row.item,
        riceTypeId: row.riceTypeId,
        pricePerKg: row.pricePerKg.toFixed(2),
        basis: row.basis,
        effectiveAt: row.effectiveAt.toISOString(),
      });
    }
    return current;
  }

  async settings(): Promise<PublicSettingsDto> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: Object.keys(DEFAULT_SETTINGS) } },
    });
    const merged = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      // Settings are stored as JSON; only plain numbers or numeric strings are valid here.
      if (typeof row.value === 'number' || typeof row.value === 'string') {
        merged[row.key as keyof PublicSettingsDto] = String(row.value);
      }
    }
    return merged;
  }
}
