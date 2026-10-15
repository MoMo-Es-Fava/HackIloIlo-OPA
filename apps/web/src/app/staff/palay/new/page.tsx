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
import { peso } from "@/lib/format";
import { currentPrice } from "@/lib/orders";
import { Button, Card, PageHeader, TextField, cn } from "@/components/ui";

const SACK_KG = 50;
const MAX_SACKS = 10_000;
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

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
  const price = condition && currentPrice(prices, condition === PalayCondition.DRY ? PriceItem.PALAY_DRY : PriceItem.PALAY_FRESH)?.pricePerKg;
  const estimate = price && n > 0 ? n * SACK_KG * Number(price) : null;
  const sacksOk = Number.isInteger(n) && n > 0 && n <= MAX_SACKS;
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader title="New offer for a farmer" sub="For farmers who walk in or call. It then appears in Palay procurement, ready to accept." />
      <Card>
        <h2 className="text-lg font-bold tracking-tight">Farmer</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="Mobile number" inputMode="tel" placeholder="0917 123 4567" value={phone}
            error={phone && !normalized ? "Enter a Philippine mobile number." : undefined}
            hint="Updates are texted here. Existing customers are found by this number."
            onChange={(e) => setPhone(e.target.value)} />
          <TextField label="Town" value={town} onChange={(e) => setTown(e.target.value)} />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-bold tracking-tight">Palay</h2>
        <div className="grid grid-cols-2 gap-3" role="group" aria-label="Fresh or dry">
          {[PalayCondition.FRESH, PalayCondition.DRY].map((c) => {
            const p = currentPrice(prices, c === PalayCondition.DRY ? PriceItem.PALAY_DRY : PriceItem.PALAY_FRESH)?.pricePerKg;
            return (
              <button key={c} type="button" aria-pressed={condition === c} onClick={() => setCondition(c)}
                className={cn("flex min-h-16 flex-col justify-center rounded-xl border-2 p-4 text-left transition-colors",
                  condition === c ? "border-paddy-d bg-mist" : "border-line bg-white hover:border-paddy/50")}>
                <span className="font-bold">{c === PalayCondition.DRY ? "Dry" : "Fresh"}</span>
                <span className="text-sm text-sub">{p ? `${peso(p)}/kg today` : "Price not set"}</span>
              </button>
            );
          })}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Number of sacks" type="number" inputMode="numeric" min={1} step={1} value={sacks}
            error={sacks && !sacksOk ? `Enter a whole number of sacks, up to ${MAX_SACKS.toLocaleString()}.` : undefined}
            hint={n > 0 ? `About ${(n * SACK_KG).toLocaleString()} kg. IRPC weighs it on arrival.` : "Count of sacks the farmer is bringing."}
            onChange={(e) => setSacks(e.target.value)} />
          <TextField label="Variety (optional)" placeholder="e.g. NSIC Rc 222" value={variety} onChange={(e) => setVariety(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3" role="group" aria-label="Delivery">
          {[[DeliveryMethod.SELF_DELIVER, "Farmer delivers"], [DeliveryMethod.IRPC_PICKUP, "IRPC picks up"]].map(([value, label]) => (
            <button key={value} type="button" aria-pressed={delivery === value} onClick={() => setDelivery(value as DeliveryMethod)}
              className={cn("min-h-12 rounded-xl border-2 px-4 font-bold transition-colors",
                delivery === value ? "border-paddy-d bg-mist" : "border-line bg-white hover:border-paddy/50")}>
              {label}
            </button>
          ))}
        </div>
        {estimate !== null && (
          <p className="rounded-xl bg-mist p-4">
            Estimated payout <span className="tnum text-xl font-bold text-paddy-d">{peso(estimate)}</span>
            <span className="block text-sm text-sub">Final payout uses the weight IRPC records. The price is locked when you accept.</span>
          </p>
        )}
        <label className="flex min-h-11 items-start gap-3 text-[15px]">
          <input type="checkbox" className="mt-1 h-5 w-5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          The farmer agreed that IRPC may store their name, number and town, and text them updates.
        </label>
        {error && <p role="alert" className="font-bold text-clay">{error}</p>}
        <div className="flex gap-3">
          <Link href="/staff/palay" className="inline-flex min-h-12 items-center rounded-xl border border-line bg-white px-5 font-bold hover:bg-mist">Cancel</Link>
          <Button arrow className="flex-1" disabled={!ready || busy} onClick={submit}>Save offer</Button>
        </div>
      </Card>
    </div>
  );
}
