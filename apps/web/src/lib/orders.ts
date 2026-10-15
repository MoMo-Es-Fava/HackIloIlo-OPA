import {
  ORDER_FLOW, OrderStatus, OrderType, ServiceType,
  type CurrentPrice, type OrderDto, type PriceItem,
} from "@irpc/types";

export const statusLabel: Record<OrderStatus, string> = {
  PENDING: "Pending", ACCEPTED: "Accepted", REJECTED: "Rejected", CANCELLED: "Cancelled",
  SCHEDULED: "Scheduled", PREPARING: "Preparing", RECEIVED: "Received", WEIGHED: "Weighed",
  DRYING: "Drying", MILLING: "Milling", READY_FOR_PICKUP: "Ready for pickup",
  PAID: "Paid", COMPLETED: "Completed",
};
export const orderTypeLabel: Record<OrderType, string> = {
  BUY_RICE: "Buy rice", SELL_PALAY: "Sell palay", SERVICE: "Drying & milling",
};
export const serviceLabel: Record<ServiceType, string> = {
  DRYING: "Drying", MILLING: "Milling", DRYING_AND_MILLING: "Drying and milling",
};

export function currentPrice(prices: CurrentPrice[], item: PriceItem, riceTypeId: number | null = null) {
  return prices.find((price) => price.item === item && price.riceTypeId === riceTypeId);
}

// Select the service-specific path through the shared graph, excluding terminal branches.
export function orderSteps(order: Pick<OrderDto, "type" | "serviceType">): OrderStatus[] {
  const steps: OrderStatus[] = [OrderStatus.PENDING];
  let current: OrderStatus = OrderStatus.PENDING;
  while (true) {
    const next: OrderStatus | undefined = ORDER_FLOW[order.type][current]?.find((status) => {
      if (status === OrderStatus.CANCELLED || status === OrderStatus.REJECTED) return false;
      if (order.type === OrderType.SERVICE) {
        if (status === OrderStatus.DRYING && order.serviceType === ServiceType.MILLING) return false;
        if (status === OrderStatus.MILLING && order.serviceType === ServiceType.DRYING) return false;
      }
      return true;
    });
    if (!next || steps.includes(next)) break;
    steps.push(next);
    current = next;
  }
  return steps;
}

export function nextOrderStatus(order: OrderDto) {
  const steps = orderSteps(order);
  const index = steps.indexOf(order.status);
  return index < 0 ? undefined : steps[index + 1];
}

export const orderAmount = (order: OrderDto) => order.finalAmount ?? order.estimatedAmount;
