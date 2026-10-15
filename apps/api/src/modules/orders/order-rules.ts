import {
  OrderStatus,
  OrderType,
  PalayCondition,
  ServiceType,
  orderRef,
  type OrderDto,
  type OrderEventDto,
} from '@irpc/types';
import { Prisma } from '../../generated/prisma/client';

type Decimal = Prisma.Decimal;
const D = (value: string | number | Prisma.Decimal) =>
  new Prisma.Decimal(value);
const money = (value: Decimal) => value.toDecimalPlaces(2);

// The subset of an order row the rules need. Matches the Prisma Order model.
export interface OrderRow {
  id: number;
  type: OrderType;
  status: OrderStatus;
  customerId: number;
  contactName: string;
  contactPhone: string;
  requestedKg: Decimal;
  preferredDate: Date;
  scheduledDate: Date | null;
  riceTypeId: number | null;
  palayCondition: PalayCondition | null;
  variety: string | null;
  deliveryMethod: string | null;
  serviceType: ServiceType | null;
  unitPrice: Decimal | null;
  dryingRate: Decimal | null;
  millingRate: Decimal | null;
  wetKg: Decimal | null;
  dryKg: Decimal | null;
  riceKg: Decimal | null;
  weightConfirmedAt: Date | null;
  estimatedAmount: Decimal;
  finalAmount: Decimal | null;
  rejectReason: string | null;
  createdAt: Date;
}

export const needsDrying = (o: Pick<OrderRow, 'serviceType'>) =>
  o.serviceType === ServiceType.DRYING ||
  o.serviceType === ServiceType.DRYING_AND_MILLING;
export const needsMilling = (o: Pick<OrderRow, 'serviceType'>) =>
  o.serviceType === ServiceType.MILLING ||
  o.serviceType === ServiceType.DRYING_AND_MILLING;

// Plain-language reason a service request is impossible, or null if it is fine.
export function serviceProblem(
  serviceType: ServiceType,
  palay: PalayCondition,
): string | null {
  if (serviceType === ServiceType.MILLING && palay === PalayCondition.FRESH) {
    return 'Fresh palay must be dried before milling. Choose drying and milling.';
  }
  if (serviceType !== ServiceType.MILLING && palay === PalayCondition.DRY) {
    return 'Dry palay does not need drying. Choose milling only.';
  }
  return null;
}

/**
 * Final amount from the locked prices and the weights recorded so far,
 * or null while a needed weight or price is still missing.
 * - BUY_RICE: requestedKg × unitPrice (the kg ordered is the kg sold)
 * - SELL_PALAY: weighed kg × unitPrice
 * - SERVICE: wetKg × dryingRate (if drying) + riceKg × millingRate (if milling)
 */
export function finalAmount(o: OrderRow): Decimal | null {
  if (o.type === OrderType.BUY_RICE) {
    return o.unitPrice ? money(o.requestedKg.mul(o.unitPrice)) : null;
  }
  if (o.type === OrderType.SELL_PALAY) {
    const kg = o.palayCondition === PalayCondition.DRY ? o.dryKg : o.wetKg;
    return kg && o.unitPrice ? money(kg.mul(o.unitPrice)) : null;
  }
  let total = D(0);
  if (needsDrying(o)) {
    if (!o.wetKg || !o.dryingRate) return null;
    total = total.add(o.wetKg.mul(o.dryingRate));
  }
  if (needsMilling(o)) {
    if (!o.riceKg || !o.millingRate) return null;
    total = total.add(o.riceKg.mul(o.millingRate));
  }
  return money(total);
}

export interface WeighIn {
  wetKg?: string;
  dryKg?: string;
  riceKg?: string;
}

export interface WeighInPlan {
  data: Partial<Pick<OrderRow, 'wetKg' | 'dryKg' | 'riceKg'>>;
  nextStatus: OrderStatus; // unchanged unless the order was RECEIVED
  kg: Decimal; // the weight recorded, for the event log
  needsConfirmation: boolean; // the customer must confirm this weight
}

/** Which weight is expected at the order's current step, or an error message. */
export function planWeighIn(o: OrderRow, w: WeighIn): WeighInPlan | string {
  const take = (field: keyof WeighIn, label: string): Decimal | string => {
    const value = w[field];
    return value ? D(value) : `Enter the ${label} weight for this step.`;
  };
  const recorded = (
    kg: Decimal | string,
    field: keyof WeighIn,
    next: OrderStatus,
    confirm: boolean,
  ) =>
    typeof kg === 'string'
      ? kg
      : {
          data: { [field]: kg },
          nextStatus: next,
          kg,
          needsConfirmation: confirm,
        };

  if (o.type === OrderType.SELL_PALAY && o.status === OrderStatus.RECEIVED) {
    const field = o.palayCondition === PalayCondition.DRY ? 'dryKg' : 'wetKg';
    return recorded(
      take(field, field === 'dryKg' ? 'dry palay' : 'fresh palay'),
      field,
      OrderStatus.WEIGHED,
      true,
    );
  }
  if (o.type === OrderType.SERVICE) {
    if (o.status === OrderStatus.RECEIVED) {
      const field = needsDrying(o) ? 'wetKg' : 'dryKg';
      return recorded(
        take(field, field === 'wetKg' ? 'palay before drying' : 'dry palay'),
        field,
        OrderStatus.WEIGHED,
        true,
      );
    }
    if (o.status === OrderStatus.DRYING) {
      // Second check: the customer confirms the dried weight too.
      return recorded(
        take('dryKg', 'dried palay'),
        'dryKg',
        OrderStatus.DRYING,
        true,
      );
    }
    if (o.status === OrderStatus.MILLING) {
      return recorded(
        take('riceKg', 'milled rice'),
        'riceKg',
        OrderStatus.MILLING,
        false,
      );
    }
  }
  return 'Weights can only be recorded when the palay is received, after drying, or after milling.';
}

/** A note for staff when a recovery rate looks wrong (possible weighing error). */
export function recoveryWarning(o: OrderRow): string | null {
  const pct = (a: Decimal, b: Decimal) => Math.round(a.div(b).toNumber() * 100);
  if (o.wetKg && o.dryKg && !o.wetKg.isZero()) {
    const p = pct(o.dryKg, o.wetKg);
    if (p < 60 || p > 95)
      return `Check the weights: dried palay is ${p}% of the fresh weight (usually about 80%).`;
  }
  if (o.dryKg && o.riceKg && !o.dryKg.isZero()) {
    const p = pct(o.riceKg, o.dryKg);
    if (p < 45 || p > 75)
      return `Check the weights: milled rice is ${p}% of the dry palay (usually about 60%).`;
  }
  return null;
}

/** Extra conditions on top of ORDER_FLOW for leaving a status. Returns an error message or null. */
export function transitionProblem(o: OrderRow, to: OrderStatus): string | null {
  if (to === OrderStatus.WEIGHED)
    return 'Record the weight with weigh-in instead.';
  if (o.status === OrderStatus.DRYING && !o.dryKg) {
    return 'Record the dried weight first.';
  }
  // The customer confirms the weight at weigh-in and again after drying.
  const confirmGate =
    o.status === OrderStatus.WEIGHED || o.status === OrderStatus.DRYING;
  if (confirmGate && !o.weightConfirmedAt) {
    return 'Wait for the customer to confirm the weight.';
  }
  if (
    o.status === OrderStatus.MILLING &&
    to === OrderStatus.READY_FOR_PICKUP &&
    !o.riceKg
  ) {
    return 'Record the milled rice weight first.';
  }
  if (
    (to === OrderStatus.PAID || to === OrderStatus.READY_FOR_PICKUP) &&
    o.type !== OrderType.BUY_RICE &&
    !finalAmount(o)
  ) {
    return 'The final amount is not known yet. Record the weights first.';
  }
  return null;
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);
const dec = (d: Decimal | null) => (d ? d.toFixed(2) : null);

export interface EventRow {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  kg: Decimal | null;
  note: string | null;
  createdAt: Date;
}

export const toEventDto = (e: EventRow): OrderEventDto => ({
  fromStatus: e.fromStatus,
  toStatus: e.toStatus,
  kg: dec(e.kg),
  note: e.note,
  createdAt: e.createdAt.toISOString(),
});

export function toOrderDto(o: OrderRow, events?: EventRow[]): OrderDto {
  return {
    id: o.id,
    ref: orderRef(o.id),
    type: o.type,
    status: o.status,
    contactName: o.contactName,
    contactPhone: o.contactPhone,
    requestedKg: o.requestedKg.toFixed(2),
    preferredDate: o.preferredDate.toISOString(),
    scheduledDate: iso(o.scheduledDate),
    riceTypeId: o.riceTypeId,
    palayCondition: o.palayCondition,
    variety: o.variety,
    deliveryMethod: o.deliveryMethod as OrderDto['deliveryMethod'],
    serviceType: o.serviceType,
    unitPrice: dec(o.unitPrice),
    dryingRate: dec(o.dryingRate),
    millingRate: dec(o.millingRate),
    wetKg: dec(o.wetKg),
    dryKg: dec(o.dryKg),
    riceKg: dec(o.riceKg),
    weightConfirmedAt: iso(o.weightConfirmedAt),
    estimatedAmount: o.estimatedAmount.toFixed(2),
    finalAmount: dec(o.finalAmount),
    rejectReason: o.rejectReason,
    createdAt: o.createdAt.toISOString(),
    ...(events ? { events: events.map(toEventDto) } : {}),
  };
}
