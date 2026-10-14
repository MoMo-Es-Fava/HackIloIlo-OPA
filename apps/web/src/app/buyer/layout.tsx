import type { ReactNode } from "react";
import BuyerShell from "@/components/BuyerShell";

export default function Layout({ children }: { children: ReactNode }) {
  return <BuyerShell>{children}</BuyerShell>;
}
