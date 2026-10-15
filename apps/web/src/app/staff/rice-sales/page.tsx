"use client";

import { OrderType } from "@irpc/types";
import StaffOrderBoard from "@/components/StaffOrderBoard";
import { IconBox } from "@/components/icons";

export default function RiceSales() {
  return (
    <StaffOrderBoard
      type={OrderType.BUY_RICE}
      title="Rice sales"
      sub="Rice orders from buyers. Check stock, accept, prepare, and collect payment at pickup."
      icon={<IconBox className="h-6 w-6" />}
    />
  );
}
