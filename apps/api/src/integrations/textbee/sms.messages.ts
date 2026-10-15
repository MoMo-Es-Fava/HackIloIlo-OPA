import { Language, OrderStatus, OrderType, ServiceType } from '@irpc/types';
import type { OrderDto } from '@irpc/types';

export type SmsOrder = Pick<
  OrderDto,
  | 'ref'
  | 'type'
  | 'status'
  | 'scheduledDate'
  | 'rejectReason'
  | 'unitPrice'
  | 'dryingRate'
  | 'millingRate'
  | 'serviceType'
>;

const sentences: Record<Language, Record<OrderStatus, string>> = {
  EN: {
    PENDING: 'We received your request. Please wait for confirmation.',
    ACCEPTED: 'Your order has been accepted.',
    REJECTED: 'Sorry, we cannot accept your request.',
    CANCELLED: 'Your order has been cancelled.',
    SCHEDULED: 'Your service has been scheduled.',
    PREPARING: 'We are preparing your rice.',
    RECEIVED: 'We received your palay at IRPC.',
    WEIGHED: 'Your palay has been weighed.',
    DRYING: 'Your palay is being dried.',
    MILLING: 'Your palay is being milled.',
    READY_FOR_PICKUP: 'Your rice is ready for pickup.',
    PAID: 'Payment for your order is complete.',
    COMPLETED: 'Your order is complete. Thank you!',
  },
  HIL: {
    PENDING: 'Nabaton namon ang imo pangabay. Palihog hulata ang kumpirmasyon.',
    ACCEPTED: 'Ginbaton na ang imo order.',
    REJECTED: 'Pasensya, indi namon mabaton ang imo pangabay.',
    CANCELLED: 'Nakansela na ang imo order.',
    SCHEDULED: 'May iskedyul na ang imo serbisyo.',
    PREPARING: 'Ginapreparar namon ang imo bugas.',
    RECEIVED: 'Nabaton na namon ang imo palay sa IRPC.',
    WEIGHED: 'Natimbang na ang imo palay.',
    DRYING: 'Ginapamala na ang imo palay.',
    MILLING: 'Ginagaling na ang imo palay.',
    READY_FOR_PICKUP: 'Handa na ang imo bugas nga kuhaon.',
    PAID: 'Tapos na ang pagbayad para sa imo order.',
    COMPLETED: 'Tapos na ang imo order. Salamat!',
  },
};

export function formatSmsDate(value: string): string {
  // Reject timezone-less timestamps so output never depends on the server timezone.
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  ) {
    throw new RangeError(
      'SMS dates must be ISO dates or timestamps with a timezone',
    );
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(new Date(value));
}

export function formatSmsPrice(value: string): string {
  if (!/^\d+(?:\.\d+)?$/.test(value)) throw new RangeError('Invalid SMS price');
  const [whole, fraction = ''] = value.split('.');
  const decimals = fraction.replace(/0+$/, '');
  return `₱${whole.replace(/^0+(?=\d)/, '')}${decimals ? `.${decimals}` : ''}/kg`;
}

export function buildStatusMessage(
  order: SmsOrder,
  language: Language = Language.EN,
): string {
  const hil = language === Language.HIL;
  let sentence = sentences[language][order.status];
  if (
    order.status === OrderStatus.READY_FOR_PICKUP &&
    order.serviceType === ServiceType.DRYING
  ) {
    sentence = hil
      ? 'Handa na ang imo ginpamala nga palay nga kuhaon.'
      : 'Your dried palay is ready for pickup.';
  }
  const parts = [`${order.ref}: ${sentence}`];
  if (order.status === OrderStatus.ACCEPTED && order.unitPrice !== null) {
    const price = formatSmsPrice(order.unitPrice);
    parts.push(
      order.type === OrderType.SELL_PALAY
        ? hil
          ? `Bakulon sang IRPC ang imo palay sa ${price}.`
          : `IRPC will buy your palay at ${price}.`
        : hil
          ? `Ang presyo sang imo bugas amo ang ${price}.`
          : `Your rice price is ${price}.`,
    );
  }
  if (
    order.type === OrderType.SERVICE &&
    order.status === OrderStatus.SCHEDULED
  ) {
    if (
      order.serviceType !== ServiceType.MILLING &&
      order.dryingRate !== null
    ) {
      parts.push(
        `${hil ? 'Bayad sa pagpamala' : 'Drying fee'}: ${formatSmsPrice(order.dryingRate)}.`,
      );
    }
    if (
      order.serviceType !== ServiceType.DRYING &&
      order.millingRate !== null
    ) {
      parts.push(
        `${hil ? 'Bayad sa paggaling' : 'Milling fee'}: ${formatSmsPrice(order.millingRate)}.`,
      );
    }
  }
  if (
    order.scheduledDate &&
    (order.status === OrderStatus.ACCEPTED ||
      order.status === OrderStatus.SCHEDULED)
  ) {
    parts.push(
      `${hil ? 'Petsa' : 'Confirmed date'}: ${formatSmsDate(order.scheduledDate)}.`,
    );
  }
  if (order.status === OrderStatus.REJECTED && order.rejectReason?.trim()) {
    parts.push(`${hil ? 'Rason' : 'Reason'}: ${order.rejectReason.trim()}`);
  }
  return parts.join(' ');
}
