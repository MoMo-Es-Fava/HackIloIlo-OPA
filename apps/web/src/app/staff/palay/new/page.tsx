"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DeliveryMethod,
  OrderType,
  PalayCondition,
  PriceItem,
  normalizePhPhone,
} from "@irpc/types";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/lib/store";
import { kgf, peso } from "@/lib/format";
import { currentPrice } from "@/lib/orders";
import { Button, Card, PageHeader, TextField, cn } from "@/components/ui";
import { IconLeaf } from "@/components/icons";

const SACK_KG = 50;
const MAX_SACKS = 10_000;
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
// Same choice tile as "Waiting at the gate" on Weigh-in.
const tile = (on: boolean) => cn(
  "flex min-h-16 flex-col justify-center rounded-2xl border-2 bg-white p-4 text-left shadow-card transition-all",
  on ? "border-paddy-d bg-mist" : "border-line/80 hover:border-paddy/50 hover:shadow-raised",
);

// Staff enter an offer for a farmer who walked in or called.
export default function NewOfferForFarmer() {
  const router = useRouter();
  const { prices } = useStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [town, setTown] = useState("Pototan");
  const [condition, setCondition] = useState<PalayCondition | null>(null);
  const [sacks, setSacks] = useState("");
  const [variety, setVariety] = useState("");
  const [delivery, setDelivery] = useState<DeliveryMethod>(DeliveryMethod.SELF_DELIVER);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = normalizePhPhone(phone);
  const n = Number(sacks);
  const sacksOk = Number.isInteger(n) && n > 0 && n <= MAX_SACKS;
  const priceOf = (c: PalayCondition) => currentPrice(prices, c === PalayCondition.DRY ? PriceItem.PALAY_DRY : PriceItem.PALAY_FRESH)?.pricePerKg;
  const price = condition && priceOf(condition);
  const estimate = price && sacksOk ? n * SACK_KG * Number(price) : null;
  const ready = name.trim().length >= 2 && normalized && condition && sacksOk && consent;

  async function submit() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      await api.staffCreateOrder({
        type: OrderType.SELL_PALAY,
        contactName: name.trim(),
        contactPhone: normalized!,
        municipality: town.trim() || undefined,
        palayCondition: condition!,
        requestedKg: String(n * SACK_KG),
        variety: variety.trim() || undefined,
        deliveryMethod: delivery,
        preferredDate: today(),
        consent: true,
      });
      router.push("/staff/palay");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save the offer. Please try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="New offer for a farmer" sub="For farmers who walk in or call. It then appears in Palay procurement, ready to accept." icon={<IconLeaf className="h-6 w-6" />} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold tracking-tight">Farmer</h2>
          <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="Mobile number" inputMode="tel" placeholder="0917 123 4567" value={phone}
            error={phone && !normalized ? "Enter a Philippine mobile number." : undefined}
            hint="Updates are texted here. Existing customers are found by this number."
            onChange={(e) => setPhone(e.target.value)} />
          <TextField label="Town" value={town} onChange={(e) => setTown(e.target.value)} />
          <label className="flex min-h-12 items-center gap-3 rounded-xl border-2 border-line p-3 transition-colors hover:border-sub/50">
            <input type="checkbox" className="h-5 w-5 shrink-0 accent-paddy-d" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>The farmer agreed that IRPC may store their name, number and town, and text them updates.</span>
          </label>
        </Card>

        <Card>
          <h2 className="text-lg font-bold tracking-tight">Palay</h2>
          <div className="grid grid-cols-2 gap-3" role="group" aria-label="Fresh or dry">
            {[PalayCondition.FRESH, PalayCondition.DRY].map((c) => {
              const p = priceOf(c);
              return (
                <button key={c} type="button" aria-pressed={condition === c} onClick={() => setCondition(c)} className={tile(condition === c)}>
                  <span className="font-bold">{c === PalayCondition.DRY ? "Dry" : "Fresh"}</span>
                  <span className="text-sm text-sub">{p ? `${peso(p)}/kg today` : "Price not set"}</span>
                </button>
              );
            })}
          </div>
          <TextField label="Number of sacks" type="number" inputMode="numeric" min={1} step={1} value={sacks}
            error={sacks && !sacksOk ? `Enter a whole number of sacks, up to ${MAX_SACKS.toLocaleString()}.` : undefined}
            hint={sacksOk ? `About ${kgf(n * SACK_KG)} (50 kg per sack). IRPC weighs it on arrival.` : "Count of 50 kg sacks the farmer is bringing."}
            onChange={(e) => setSacks(e.target.value)} />
          <TextField label="Variety (optional)" placeholder="e.g. NSIC Rc 222" value={variety} onChange={(e) => setVariety(e.target.value)} />
          <div className="grid grid-cols-2 gap-3" role="group" aria-label="Delivery">
            {([[DeliveryMethod.SELF_DELIVER, "Farmer delivers"], [DeliveryMethod.IRPC_PICKUP, "IRPC picks up"]] as const).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={delivery === value} onClick={() => setDelivery(value)} className={tile(delivery === value)}>
                <span className="font-bold">{label}</span>
              </button>
            ))}
          </div>
          {estimate !== null && (
            <div className="rounded-xl border border-line/80 bg-mist/60 p-4 text-sm">
              <p>Estimated payout: <span className="tnum font-bold">{peso(estimate)}</span></p>
              <p className="mt-1 text-sub">Final payout uses the weight IRPC records. The price is locked when you accept.</p>
            </div>
          )}
          {error && <p role="alert" className="text-clay">{error}</p>}
          <div className="flex gap-2">
            <Button arrow disabled={!ready || busy} onClick={submit}>Save offer</Button>
            <Link href="/staff/palay" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-5 text-[15px] font-bold tracking-tight text-ink transition-colors hover:border-paddy/50 hover:bg-mist">Cancel</Link>
          </div>
        </Card>
      </div>
    </>
  );
}
