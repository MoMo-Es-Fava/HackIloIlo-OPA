"use client";

import { useParams } from "next/navigation";
import Receipt from "@/components/Receipt";

export default function BuyerReceipt() {
  const { id } = useParams<{ id: string }>();
  return <Receipt orderId={id} backHref={`/buyer/orders/${id}`} />;
}
