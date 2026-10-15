import { Language, PriceItem } from '@irpc/types';
import type { CurrentPrice, RiceTypeDto } from '@irpc/types';
import { buildStatusMessage, formatSmsPrice } from './sms.messages';
import type { SmsOrder } from './sms.messages';

export type SmsCommand =
  | { type: 'prices' }
  | { type: 'status'; orderId: number }
  | { type: 'unknown' };

export function parseSmsCommand(text: string): SmsCommand {
  const normalized = text.trim().replace(/\s+/g, ' ').toUpperCase();
  if (normalized === 'PRESYO' || normalized === 'PRICE')
    return { type: 'prices' };
  const match = /^STATUS (?:IRPC-)?(\d+)$/.exec(normalized);
  if (match) {
    const orderId = Number(match[1]);
    if (Number.isSafeInteger(orderId) && orderId > 0)
      return { type: 'status', orderId };
  }
  return { type: 'unknown' };
}

const labels: Record<Language, Record<PriceItem, string>> = {
  EN: {
    PALAY_FRESH: 'Fresh palay',
    PALAY_DRY: 'Dry palay',
    RICE: 'Rice',
    DRYING_FEE: 'Drying',
    MILLING_FEE: 'Milling',
  },
  HIL: {
    PALAY_FRESH: 'Bag-o nga palay',
    PALAY_DRY: 'Mala nga palay',
    RICE: 'Bugas',
    DRYING_FEE: 'Pagpamala',
    MILLING_FEE: 'Paggaling',
  },
};

export function buildPriceReply(
  prices: readonly CurrentPrice[],
  language: Language = Language.EN,
  riceTypes: readonly RiceTypeDto[] = [],
): string {
  if (!prices.length)
    return language === Language.HIL
      ? 'IRPC: Wala pa sang presyo. Palihog magpamangkot sa IRPC.'
      : 'IRPC: Prices are not available yet. Please contact IRPC.';
  return [
    'IRPC:',
    ...prices.map((price) => {
      let label = labels[language][price.item];
      if (price.item === PriceItem.RICE && price.riceTypeId !== null) {
        label += ` (${riceTypes.find((rice) => rice.id === price.riceTypeId)?.name ?? `#${price.riceTypeId}`})`;
      }
      return `${label}: ${formatSmsPrice(price.pricePerKg)}`;
    }),
  ].join('\n');
}

export function buildOrderStatusReply(
  order: SmsOrder,
  language: Language = Language.EN,
): string {
  return buildStatusMessage(order, language);
}
