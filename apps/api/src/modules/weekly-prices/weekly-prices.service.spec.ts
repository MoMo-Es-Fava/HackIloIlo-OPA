import { Language, PriceBasis, PriceItem } from '@irpc/types';
import { PrismaService } from '../../database/prisma.service';
import { SmsService } from '../../integrations/textbee/sms.service';
import { CatalogService } from '../catalog/catalog.service';
import { priceWeek, WeeklyPricesService } from './weekly-prices.service';

describe('weekly prices', () => {
  it('uses the Sunday boundary and 8am schedule in Manila', () => {
    expect(priceWeek(new Date('2026-10-17T15:59:59Z')).start.toISOString()).toBe('2026-10-11T00:00:00.000Z');
    expect(priceWeek(new Date('2026-10-17T16:00:00Z'))).toEqual({ start: new Date('2026-10-18'), due: false });
    expect(priceWeek(new Date('2026-10-18T00:00:00Z')).due).toBe(true);
    expect(priceWeek(new Date('2026-10-19T00:00:00Z')).due).toBe(true);
  });

  function setup() {
    const prisma = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn().mockResolvedValue([{ id: 1, phone: '+639171234567', language: Language.EN }]),
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((work: (tx: typeof prisma) => Promise<void>) => work(prisma));
    const catalog = {
      getPrices: jest.fn().mockResolvedValue([{ item: PriceItem.PALAY_FRESH, riceTypeId: null, pricePerKg: '17', basis: PriceBasis.MARKET, effectiveAt: '2026-10-15' }]),
      getRiceTypes: jest.fn().mockResolvedValue([]),
    };
    const sms = { send: jest.fn().mockResolvedValue({ status: 'queued', batchId: 'batch-1' }) };
    const service = new WeeklyPricesService(prisma as unknown as PrismaService, catalog as unknown as CatalogService, sms as unknown as SmsService);
    return { service, prisma, catalog, sms };
  }

  it('sends prices and records queue acceptance through the existing SMS service', async () => {
    const { service, prisma, sms } = setup();
    await service.sendPending(new Date('2026-10-18'));
    expect(sms.send).toHaveBeenCalledWith('+639171234567', expect.stringContaining('17'));
    expect(prisma.$executeRaw.mock.calls[1]).toEqual(expect.arrayContaining(['QUEUED', 'batch-1']));
  });

  it('does not send when another worker already claimed the notification', async () => {
    const { service, prisma, sms } = setup();
    prisma.$executeRaw.mockResolvedValue(0);
    await service.sendPending(new Date('2026-10-18'));
    expect(sms.send).not.toHaveBeenCalled();
  });

  it('keeps notifications pending while there are no published prices', async () => {
    const { service, catalog, prisma, sms } = setup();
    catalog.getPrices.mockResolvedValue([]);
    await service.sendPending(new Date('2026-10-18'));
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    expect(sms.send).not.toHaveBeenCalled();
  });

  it('records ambiguous failures without immediately retrying', async () => {
    const { service, prisma, sms } = setup();
    sms.send.mockRejectedValue(new Error('timeout'));
    await service.sendPending(new Date('2026-10-18'));
    expect(sms.send).toHaveBeenCalledTimes(1);
    expect(String(prisma.$executeRaw.mock.calls[1][0])).toContain("'FAILED'");
  });

  it('enrolls a verified signup and queues its current week before waking the worker', async () => {
    const { service, prisma } = setup();
    const tick = jest.spyOn(service, 'tick').mockResolvedValue();
    await service.afterVerifiedSignup(42, new Date('2026-10-17T17:00:00Z'));
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw.mock.calls[1]).toEqual(expect.arrayContaining([42, new Date('2026-10-18')]));
    expect(tick).toHaveBeenCalledTimes(1);
  });
});
