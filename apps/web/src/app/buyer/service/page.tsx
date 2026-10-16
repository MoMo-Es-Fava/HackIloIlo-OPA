"use client";

import { useState } from "react";
import { PriceItem, ServiceType, orderRef } from "@irpc/types";
import { useStore } from "@/lib/store";
import { kgf, dateLabel, peso } from "@/lib/format";
import { currentPrice, serviceLabel, statusLabel } from "@/lib/orders";
import { MOCK_MILLING_RECOVERY } from "@/lib/mock-orders";
import { Badge, Button, Card, Empty, PageHeader, SelectField, TextField, Notice, orderTone } from "@/components/ui";
import { IconWrench } from "@/components/icons";

const SACK_KG = 50;
const MAX_SACKS = 10_000;

export default function Service() {
  const { serviceRequests, prices, isMock, orderError, profile, addServiceRequest } = useStore();
  const [service, setService] = useState<ServiceType>(ServiceType.DRYING);
  const [sacks, setSacks] = useState("");
  const [date, setDate] = useState("");
  const [sentId, setSentId] = useState<string | null>(null);

  const dryingFee = Number(currentPrice(prices, PriceItem.DRYING_FEE)?.pricePerKg ?? NaN);
  const millingFee = Number(currentPrice(prices, PriceItem.MILLING_FEE)?.pricePerKg ?? NaN);
  const feesKnown = Number.isFinite(dryingFee) && Number.isFinite(millingFee);
  const count = Number(sacks);
  const sacksOk = Number.isInteger(count) && count > 0 && count <= MAX_SACKS;
  const n = sacksOk ? count * SACK_KG : 0;
  const sacksErr = sacks !== "" && !sacksOk ? `Enter a whole number of sacks, up to ${MAX_SACKS.toLocaleString()}` : undefined;
  const ok = n > 0 && Boolean(date) && feesKnown;
  const estimate = n > 0 && feesKnown
    ? (service !== ServiceType.MILLING ? n * dryingFee : 0)
      + (service !== ServiceType.DRYING ? n * MOCK_MILLING_RECOVERY * millingFee : 0)
    : null;
  const feeLabel = (type: ServiceType) => {
    if (!feesKnown) return "fee not available";
    return [
      type !== ServiceType.MILLING ? `${peso(dryingFee)}/kg drying` : null,
      type !== ServiceType.DRYING ? `${peso(millingFee)}/kg milling` : null,
    ].filter(Boolean).join(" + ");
  };

  async function send() {
    if (!ok) return;
    const id = await addServiceRequest(service, n, date);
    if (id !== null) { setSacks(""); setDate(""); setSentId(orderRef(id)); }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Drying and milling"
        sub="Tell us what you need. The IRPC team will review your request and confirm availability."
        icon={<IconWrench className="h-6 w-6" />}
      />
      <Card>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold tracking-tight">What do you need?</h2>
            <p className="text-sm text-sub">Choose a service. No fee is charged until IRPC confirms your request.</p>
          </div>
          <SelectField label="Service" value={service} onChange={(e) => { setService(e.target.value as ServiceType); setSentId(null); }}>
            {Object.values(ServiceType).map((type) => (
              <option key={type} value={type}>{serviceLabel[type]} ({feeLabel(type)})</option>
            ))}
          </SelectField>
          <TextField
            label="Number of sacks"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={sacks}
            error={sacksErr}
            hint={n > 0 ? `About ${kgf(n)} (50 kg per sack). IRPC weighs it on arrival.` : "Count your 50 kg sacks of palay."}
            onChange={(e) => { setSacks(e.target.value); setSentId(null); }}
          />
          <TextField label="Preferred date" type="date" value={date} onChange={(e) => { setDate(e.target.value); setSentId(null); }} />
          <div className="rounded-xl border border-line/80 bg-mist/60 p-4 text-sm">
            <p className="font-bold">Request for {profile.name}</p>
            {estimate !== null && (
              <p className="mt-1">
                Estimated fee: <span className="tnum font-bold">{peso(estimate)}</span>
                {service !== ServiceType.DRYING ? ` (milling estimated at about ${Math.round(MOCK_MILLING_RECOVERY * 100)}% of your palay weight)` : ""}
              </p>
            )}
            <p className="mt-1 text-sub">Your request is not booked until the IRPC team approves it. The final fee uses the weight IRPC records.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
            <Button arrow disabled={!ok} onClick={send}>
              Send request
            </Button>
            <p className="text-sm text-sub">You can check the request status below.</p>
          </div>
          {orderError && <p role="alert" className="font-bold text-clay lg:col-span-2">{orderError}</p>}
          {sentId && (
            <div className="lg:col-span-2">
              <Notice tone="ok">
              <p className="font-bold text-paddy-d">Request {sentId} sent to IRPC</p>
              <p className="mt-1 text-sm text-sub">The team will review it and update the status here.{isMock ? " This demo does not send SMS." : ""}</p>
              </Notice>
            </div>
          )}
        </div>
      </Card>

      <div className="mt-2">
        <h2 className="text-xl font-bold tracking-tight">Your requests</h2>
        <p className="text-sm text-sub">See whether each request is waiting, approved, or declined.</p>
      </div>
      {serviceRequests.length === 0 && <Empty>No service requests yet. Your request status will appear here after you submit.</Empty>}
      <div className="grid gap-3 xl:grid-cols-2">
        {serviceRequests.map((s) => (
          <Card key={s.id} className="flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-mist text-paddy-d">
                <IconWrench className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold tracking-tight">
                  {s.serviceType ? serviceLabel[s.serviceType] : "Service"}: <span className="tnum">{kgf(s.requestedKg)}</span>
                </p>
                <p className="text-sm text-sub">{s.ref}. {s.scheduledDate ? dateLabel(s.scheduledDate) : `Requested ${dateLabel(s.preferredDate)}`}</p>
              </div>
            </div>
            <Badge tone={orderTone(s.status)}>{statusLabel[s.status]}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
