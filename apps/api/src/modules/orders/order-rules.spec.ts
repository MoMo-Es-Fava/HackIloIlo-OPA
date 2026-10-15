import {
  OrderStatus,
  OrderType,
  PalayCondition,
  ServiceType,
} from '@irpc/types';
import { Prisma } from '../../generated/prisma/client';
import {
  finalAmount,
  planWeighIn,
  recoveryWarning,
  serviceProblem,
  toOrderDto,
  transitionProblem,
  type OrderRow,
} from './order-rules';

const D = (v: string) => new Prisma.Decimal(v);
const base: OrderRow = {
  id: 42,
  type: OrderType.SERVICE,
  status: OrderStatus.RECEIVED,
  customerId: 7,
  contactName: 'Juan',
  contactPhone: '+639171234567',
  requestedKg: D('1000'),
  preferredDate: new Date('2026-10-20T00:00:00Z'),
  scheduledDate: null,
  riceTypeId: null,
  palayCondition: PalayCondition.FRESH,
  variety: null,
  deliveryMethod: null,
  serviceType: ServiceType.DRYING_AND_MILLING,
  unitPrice: null,
  dryingRate: D('1.60'),
  millingRate: D('3.30'),
  wetKg: null,
  dryKg: null,
  riceKg: null,
  weightConfirmedAt: null,
  estimatedAmount: D('3184'),
  finalAmount: null,
  rejectReason: null,
  createdAt: new Date('2026-10-15T00:00:00Z'),
};
const order = (patch: Partial<OrderRow>): OrderRow => ({ ...base, ...patch });

describe('finalAmount', () => {
  it('buy rice: ordered kg × locked price', () => {
    const o = order({
      type: OrderType.BUY_RICE,
      serviceType: null,
      requestedKg: D('150'),
      unitPrice: D('50.70'),
    });
    expect(finalAmount(o)?.toFixed(2)).toBe('7605.00');
  });

  it('sell palay: weighed kg × locked price, using the dry weight for dry palay', () => {
    const fresh = order({
      type: OrderType.SELL_PALAY,
      serviceType: null,
      unitPrice: D('17'),
      wetKg: D('520'),
    });
    const dry = order({
      type: OrderType.SELL_PALAY,
      serviceType: null,
      palayCondition: PalayCondition.DRY,
      unitPrice: D('22'),
      dryKg: D('500'),
    });
    expect(finalAmount(fresh)?.toFixed(2)).toBe('8840.00');
    expect(finalAmount(dry)?.toFixed(2)).toBe('11000.00');
  });

  it('service: drying on wet kg in + milling on rice kg out, unknown until rice is weighed', () => {
    expect(finalAmount(order({ wetKg: D('1000') }))).toBeNull();
    expect(
      finalAmount(order({ wetKg: D('1000'), riceKg: D('480') }))?.toFixed(2),
    ).toBe('3184.00');
    const dryingOnly = order({
      serviceType: ServiceType.DRYING,
      millingRate: null,
      wetKg: D('1000'),
    });
    expect(finalAmount(dryingOnly)?.toFixed(2)).toBe('1600.00');
  });
});

describe('planWeighIn', () => {
  it('records the fresh weight at receipt and asks for confirmation', () => {
    const plan = planWeighIn(order({}), { wetKg: '1000' });
    expect(plan).toMatchObject({
      nextStatus: OrderStatus.WEIGHED,
      needsConfirmation: true,
    });
  });

  it('asks for the right weight for the step', () => {
    expect(planWeighIn(order({}), { dryKg: '800' })).toMatch(
      /palay before drying/,
    );
    expect(planWeighIn(order({ status: OrderStatus.DRYING }), {})).toMatch(
      /dried palay/,
    );
    expect(
      planWeighIn(order({ status: OrderStatus.MILLING }), { riceKg: '480' }),
    ).toMatchObject({
      nextStatus: OrderStatus.MILLING,
      needsConfirmation: false,
    });
  });

  it('milling-only orders weigh dry palay at receipt', () => {
    const milling = order({
      serviceType: ServiceType.MILLING,
      palayCondition: PalayCondition.DRY,
      dryingRate: null,
    });
    expect(planWeighIn(milling, { dryKg: '800' })).toMatchObject({
      nextStatus: OrderStatus.WEIGHED,
    });
  });

  it('refuses weigh-in at other steps', () => {
    expect(
      planWeighIn(order({ status: OrderStatus.SCHEDULED }), { wetKg: '1' }),
    ).toMatch(/can only be recorded/);
  });
});

describe('transitionProblem', () => {
  it('waits for the customer to confirm the weight', () => {
    expect(
      transitionProblem(
        order({ status: OrderStatus.WEIGHED, wetKg: D('1000') }),
        OrderStatus.DRYING,
      ),
    ).toMatch(/confirm/);
    expect(
      transitionProblem(
        order({
          status: OrderStatus.WEIGHED,
          wetKg: D('1000'),
          weightConfirmedAt: new Date(),
        }),
        OrderStatus.DRYING,
      ),
    ).toBeNull();
  });

  it('needs the dried weight, confirmed, before leaving drying', () => {
    const drying = order({
      status: OrderStatus.DRYING,
      wetKg: D('1000'),
      weightConfirmedAt: new Date(),
    });
    expect(transitionProblem(drying, OrderStatus.MILLING)).toMatch(
      /dried weight/,
    );
    expect(
      transitionProblem(
        { ...drying, dryKg: D('800'), weightConfirmedAt: null },
        OrderStatus.MILLING,
      ),
    ).toMatch(/confirm/);
  });

  it('needs the rice weight before pickup, and never sets WEIGHED directly', () => {
    expect(
      transitionProblem(
        order({ status: OrderStatus.MILLING, wetKg: D('1000') }),
        OrderStatus.READY_FOR_PICKUP,
      ),
    ).toMatch(/milled rice/);
    expect(
      transitionProblem(
        order({ status: OrderStatus.RECEIVED }),
        OrderStatus.WEIGHED,
      ),
    ).toMatch(/weigh-in/);
  });
});

describe('service and weight checks', () => {
  it('rejects impossible service requests', () => {
    expect(serviceProblem(ServiceType.MILLING, PalayCondition.FRESH)).toMatch(
      /dried before milling/,
    );
    expect(serviceProblem(ServiceType.DRYING, PalayCondition.DRY)).toMatch(
      /does not need drying/,
    );
    expect(
      serviceProblem(ServiceType.DRYING_AND_MILLING, PalayCondition.FRESH),
    ).toBeNull();
  });

  it('flags unusual recovery rates', () => {
    expect(
      recoveryWarning(order({ wetKg: D('1000'), dryKg: D('800') })),
    ).toBeNull();
    expect(
      recoveryWarning(order({ wetKg: D('1000'), dryKg: D('400') })),
    ).toMatch(/40%/);
    expect(
      recoveryWarning(order({ dryKg: D('800'), riceKg: D('300') })),
    ).toMatch(/38%/);
  });

  it('serializes money and kg as 2-decimal strings with the IRPC reference', () => {
    const dto = toOrderDto(order({ wetKg: D('1000.5') }));
    expect(dto).toMatchObject({
      ref: 'IRPC-0042',
      requestedKg: '1000.00',
      wetKg: '1000.50',
      dryingRate: '1.60',
    });
  });
});
