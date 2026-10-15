import type { CurrentPrice, RiceTypeDto } from '@irpc/types';

export type NewPrice = Omit<CurrentPrice, 'effectiveAt'>;

/** Implement with the shared Prisma service once its schema is available. */
export abstract class PricesRepository {
  abstract listRiceTypes(): Promise<RiceTypeDto[]>;

  /** Latest effective row per (item, riceTypeId), excluding future prices. */
  abstract listCurrentPrices(): Promise<CurrentPrice[]>;

  /** INSERT a new row. Never overwrite earlier price records. */
  abstract insertPrice(price: NewPrice): Promise<CurrentPrice>;
}
