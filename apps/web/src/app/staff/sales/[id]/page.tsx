"use client";

import { useParams } from "next/navigation";
import Receipt from "@/components/Receipt";

export default function StaffReceipt() {
  const { id } = useParams<{ id: string }>();
  return <Receipt orderId={id} backHref="/staff/sales" />;
}
