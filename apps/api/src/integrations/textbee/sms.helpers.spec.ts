import {
  Language,
  OrderStatus,
  OrderType,
  PriceBasis,
  PriceItem,
  ServiceType,
} from '@irpc/types';
import {
  buildStatusMessage,
  formatSmsDate,
  formatSmsPrice,
} from './sms.messages';
import type { SmsOrder } from './sms.messages';
import { buildPriceReply } from './sms.commands';

const order: SmsOrder = {
  ref: 'IRPC-0042',
  type: OrderType.SELL_PALAY,
  status: OrderStatus.ACCEPTED,
  unitPrice: '17.00',
  dryingRate: null,
  millingRate: null,
  serviceType: null,
  scheduledDate: '2026-10-20T00:00:00.000Z',
  rejectReason: null,
};

describe('SMS message builders', () => {
  it('uses the locked price and a friendly Philippine date', () => {
    expect(buildStatusMessage(order, Language.EN)).toBe(
      'IRPC-0042: Your order has been accepted. IRPC will buy your palay at ₱17/kg. Confirmed date: Oct 20.',
    );
    expect(buildStatusMessage(order, Language.HIL)).toBe(
      'IRPC-0042: Ginbaton na ang imo order. Bakulon sang IRPC ang imo palay sa ₱17/kg. Petsa: Oct 20.',
    );
  });
  it('converts UTC midnight boundaries to Philippine dates', () => {
    expect(formatSmsDate('2026-10-19T16:00:00Z')).toBe('Oct 20');
    expect(formatSmsDate('2026-10-19T15:59:59Z')).toBe('Oct 19');
    expect(formatSmsDate('2026-12-31T16:00:00Z')).toBe('Jan 1');
    expect(formatSmsDate('2026-10-20')).toBe('Oct 20');
    expect(() => formatSmsDate('invalid')).toThrow(RangeError);
    expect(() => formatSmsDate('2026-10-20T00:00:00')).toThrow(RangeError);
  });
  it.each(Object.values(OrderStatus))(
    'has bilingual prose for %s',
    (status) => {
      const en = buildStatusMessage({ ...order, status }, Language.EN);
      const hil = buildStatusMessage({ ...order, status }, Language.HIL);
      expect(en).not.toContain(status);
      expect(hil).not.toContain(status);
      expect(en).not.toBe(hil);
      expect(en).not.toMatch(/undefined|2026-/);
      expect(hil).not.toMatch(/undefined|2026-/);
    },
  );
  it('uses the right commodity and service fees', () => {
    expect(
      buildStatusMessage({ ...order, type: OrderType.BUY_RICE }),
    ).toContain('Your rice price is ₱17/kg.');
    const service = {
      ...order,
      type: OrderType.SERVICE,
      status: OrderStatus.SCHEDULED,
      serviceType: ServiceType.DRYING_AND_MILLING,
      dryingRate: '1.60',
      millingRate: '3.30',
    };
    expect(buildStatusMessage(service)).toContain(
      'Drying fee: ₱1.6/kg. Milling fee: ₱3.3/kg.',
    );
    expect(
      buildStatusMessage({ ...service, serviceType: ServiceType.DRYING }),
    ).not.toContain('Milling fee');
    expect(
      buildStatusMessage({
        ...service,
        serviceType: ServiceType.DRYING,
        status: OrderStatus.READY_FOR_PICKUP,
      }),
    ).toContain('Your dried palay is ready for pickup.');
  });
  it('preserves reasons and does not invent missing locked prices', () => {
    expect(
      buildStatusMessage({
        ...order,
        status: OrderStatus.REJECTED,
        rejectReason: 'No stock.',
      }),
    ).toContain('Reason: No stock.');
    expect(
      buildStatusMessage(
        { ...order, status: OrderStatus.REJECTED, rejectReason: 'No stock.' },
        Language.HIL,
      ),
    ).toContain('Rason: No stock.');
    expect(buildStatusMessage({ ...order, unitPrice: null })).not.toContain(
      '₱',
    );
    expect(formatSmsPrice('0.00')).toBe('₱0/kg');
    expect(formatSmsPrice('123456789012345678.50')).toBe(
      '₱123456789012345678.5/kg',
    );
    expect(() => formatSmsPrice('NaN')).toThrow();
  });
});

describe('price reply', () => {
  it('lists every price category in both languages and distinguishes rice types', () => {
    const prices = Object.values(PriceItem).map((item) =>
      Object.freeze({
        item,
        riceTypeId: item === PriceItem.RICE ? 7 : null,
        pricePerKg: '17.00',
        basis: PriceBasis.MARKET,
        effectiveAt: '2026-10-20',
      }),
    );
    const en = buildPriceReply(Object.freeze(prices));
    expect(en).toContain('Rice (#7): ₱17/kg');
    expect(en).toContain('Fresh palay: ₱17/kg');
    expect(en).toContain('Dry palay: ₱17/kg');
    expect(en).toContain('Drying: ₱17/kg');
    expect(en).toContain('Milling: ₱17/kg');
    const hil = buildPriceReply(prices, Language.HIL, [
      {
        id: 7,
        name: 'Dinorado',
        description: null,
        stockKg: '100',
        pricePerKg: '17.00',
      },
    ]);
    expect(hil).toContain('Bugas (Dinorado): ₱17/kg');
    expect(hil).toContain('Pagpamala: ₱17/kg');
    expect(buildPriceReply([], Language.EN)).toContain('not available');
    expect(buildPriceReply([], Language.HIL)).toContain('Wala pa');
  });
});
