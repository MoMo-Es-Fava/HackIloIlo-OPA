"use client";

import { useState } from "react";
import { PriceItem, ServiceType, orderRef } from "@irpc/types";
import { useStore } from "@/lib/store";
import { kgf, dateLabel, peso } from "@/lib/format";
import { currentPrice, serviceLabel, statusLabel } from "@/lib/orders";
import { MOCK_MILLING_RECOVERY } from "@/lib/mock-orders";
import { Badge, Button, Card, Empty, PageHeader, TextField, cn, orderTone } from "@/components/ui";
import { IconWrench } from "@/components/icons";

const serviceHint: Record<ServiceType, string> = {
  DRYING: "Dry your fresh palay.",
  MILLING: "Mill your dry palay into rice.",
  DRYING_AND_MILLING: "Dry first, then mill.",
};

export default function Service() {
  const { serviceRequests, prices, isMock, orderError, profile, addServiceRequest } = useStore();
  const [service, setService] = useState<ServiceType | null>(null);
  const [kg, setKg] = useState("");
  const [touched, setTouched] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);

  const dryingFee = Number(currentPrice(prices, PriceItem.DRYING_FEE)?.pricePerKg ?? NaN);
  const millingFee = Number(currentPrice(prices, PriceItem.MILLING_FEE)?.pricePerKg ?? NaN);
  const feesKnown = Number.isFinite(dryingFee) && Number.isFinite(millingFee);
  const n = Number(kg);
  const kgErr = !kg.trim() ? "Enter how many kg you have" : !(n > 0) ? "Enter a quantity above 0" : undefined;
  const serviceErr = service ? undefined : "Choose a service";
  const estimate = service && n > 0 && feesKnown
    ? (service !== ServiceType.MILLING ? n * dryingFee : 0)
      + (service !== ServiceType.DRYING ? n * MOCK_MILLING_RECOVERY * millingFee : 0)
    : null;
  const feeLabel = (type: ServiceType) => {
    if (!feesKnown) return "Fee not available";
    const parts = [
      type !== ServiceType.MILLING ? `${peso(dryingFee)}/kg drying` : null,
      type !== ServiceType.DRYING ? `${peso(millingFee)}/kg milling` : null,
    ].filter(Boolean);
    return parts.join(" + ");
  };

  async function send() {
    setTouched(true);
    if (!service || kgErr || !feesKnown) return;
    // The shared contract requires preferredDate. IRPC sets the real service date when it accepts the request.
    const requestedOn = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
    const id = await addServiceRequest(service, n, requestedOn);
    if (id !== null) { setKg(""); setService(null); setTouched(false); setSentId(orderRef(id)); }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <PageHeader
        title="Drying and milling"
        sub="Tell us what you need. The IRPC team will review your request and set your service date."
        icon={<IconWrench className="h-6 w-6" />}
      />
      <Card>
        <h2 className="text-lg font-bold tracking-tight">What do you need?</h2>
        <p className="text-sm text-sub">No fee is charged until IRPC confirms your request.</p>
        <div className="flex flex-col gap-2" role="group" aria-label="Service">
          {Object.values(ServiceType).map((type) => (
            <button key={type} type="button" aria-pressed={service === type}
              onClick={() => { setService(type); setSentId(null); }}
              className={cn("flex min-h-16 flex-col justify-center rounded-xl border-2 p-4 text-left transition-colors",
                service === type ? "border-paddy-d bg-mist" : "border-line bg-white hover:border-paddy/50")}>
              <span className="font-bold">{serviceLabel[type]}</span>
              <span className="text-sm text-sub">{serviceHint[type]} {feeLabel(type)}</span>
            </button>
          ))}
          {touched && serviceErr && <p className="text-sm font-bold text-clay">{serviceErr}</p>}
        </div>
        <TextField label="Quantity (kg)" type="number" inputMode="decimal" min={1} step="any" value={kg}
          error={touched || kg ? kgErr : undefined}
          hint={n > 0 ? `≈ ${(n / 50).toFixed(1)} sacks of 50 kg` : "Your best estimate. IRPC weighs it on arrival."}
          onChange={(e) => { setKg(e.target.value); setSentId(null); }} />
        <div className="rounded-xl bg-mist p-4" aria-live="polite">
          <p className="text-sm text-sub">Estimated fee</p>
          <p className="text-3xl font-bold text-paddy-d">{estimate === null ? "—" : peso(estimate)}</p>
          <p className="mt-1 text-sm text-sub">
            This is an estimate only. The final fee is based on the weight IRPC records
            {service && service !== ServiceType.DRYING ? `, and milling is estimated at about ${Math.round(MOCK_MILLING_RECOVERY * 100)}% of your palay weight` : ""}.
          </p>
        </div>
        <p className="text-sm text-sub">Request for {profile.name}. It is not booked until IRPC approves it.</p>
        <Button disabled={!feesKnown} onClick={send}>Send request</Button>
        {orderError && <p role="alert" className="font-bold text-clay">{orderError}</p>}
        {sentId && (
          <div role="status" className="rounded-xl border border-paddy/30 bg-mist p-4">
            <p className="font-bold text-paddy-d">Request {sentId} sent to IRPC</p>
            <p className="mt-1 text-sm text-sub">The team will review it and update the status below.{isMock ? " This demo does not send SMS." : ""}</p>
          </div>
        )}
      </Card>
      <div>
        <h2 className="text-xl font-bold tracking-tight">Your requests</h2>
        <p className="text-sm text-sub">See whether each request is pending, scheduled, or progressing through the plant.</p>
      </div>
      {serviceRequests.length === 0 && <Empty>No service requests yet. Your request status will appear here after you submit.</Empty>}
      {serviceRequests.map((s) => (
        <Card key={s.id}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mist text-paddy-d">
                <IconWrench className="h-5 w-5" />
              </span>
              <p className="font-bold tracking-tight">{s.serviceType ? serviceLabel[s.serviceType] : "Service"}: <span className="tnum">{kgf(s.requestedKg)}</span></p>
            </div>
            <Badge tone={orderTone(s.status)}>{statusLabel[s.status]}</Badge>
          </div>
          <p className="text-sm text-sub">{s.ref}. Requested {dateLabel(s.createdAt)}{s.scheduledDate ? ` · Service date ${dateLabel(s.scheduledDate)}` : " · Date to be set by IRPC"}</p>
        </Card>
      ))}
    </div>
  );
}
