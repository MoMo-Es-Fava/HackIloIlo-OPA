"use client";

import Link from "next/link";
import { useState } from "react";
import { DeliveryMethod, PalayCondition, orderRef } from "@irpc/types";
import { useStore } from "@/lib/store";
import { kgf, peso } from "@/lib/format";
import { Button, Card, PageHeader, SelectField, TextField, cn } from "@/components/ui";

type Step = "condition" | "details" | "review" | "done";
const STEPS: { id: Step; label: string }[] = [
  { id: "condition", label: "Palay type" }, { id: "details", label: "Details" },
  { id: "review", label: "Review" }, { id: "done", label: "Done" },
];
const conditionLabel: Record<PalayCondition, string> = { FRESH: "Fresh palay", DRY: "Dry palay" };
const conditionHint: Record<PalayCondition, string> = {
  FRESH: "Just harvested and still wet.", DRY: "Already sun-dried and ready to mill.",
};
const deliveryLabel: Record<DeliveryMethod, string> = {
  SELF_DELIVER: "I will deliver it to IRPC", IRPC_PICKUP: "IRPC picks it up from me",
};

const OTHER = "__other__";

export default function SellPalay() {
  const { palayPrices, riceTypes, profile, isMock, orderError, sellPalay } = useStore();
  const [step, setStep] = useState<Step>("condition");
  const [condition, setCondition] = useState<PalayCondition | null>(null);
  const [kg, setKg] = useState("");
  const [varietyChoice, setVarietyChoice] = useState("");
  const [otherVariety, setOtherVariety] = useState("");
  const [delivery, setDelivery] = useState<DeliveryMethod | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const price = (c: PalayCondition) => c === PalayCondition.FRESH ? palayPrices.fresh : palayPrices.dry;
  const rate = condition ? price(condition) : null;
  const amount = Number(kg);
  const isOther = varietyChoice === OTHER;
  const variety = (isOther ? otherVariety : varietyChoice).trim();
  const errors = {
    kg: !kg.trim() ? "Enter how many kg you want to sell" : !(amount > 0) ? "Enter a quantity above 0" : undefined,
    variety: !varietyChoice ? "Choose the rice variety" : isOther && !variety ? "Type the rice variety" : undefined,
    delivery: !delivery ? "Choose how the palay gets to IRPC" : undefined,
  };
  const detailsOk = !errors.kg && !errors.variety && !errors.delivery;
  const payout = rate !== null && amount > 0 ? amount * rate : null;
  const stepIndex = STEPS.findIndex((s) => s.id === step);

  async function submit() {
    if (!condition || !delivery || !detailsOk) return;
    // The shared contract requires preferredDate. IRPC sets the real date when it accepts the order.
    const requestedOn = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
    const id = await sellPalay({ condition, kg: amount, variety, preferredDate: requestedOn, deliveryMethod: delivery });
    if (id !== null) { setRef(orderRef(id)); setStep("done"); }
  }
  function reset() {
    setStep("condition"); setCondition(null); setKg(""); setVarietyChoice(""); setOtherVariety(""); setDelivery(null);
    setRef(null); setTouched(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <PageHeader title="Sell palay" sub="Tell us what you are bringing. IRPC confirms your date and the final price after weighing." />
      <ol className="flex gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s.id} aria-current={i === stepIndex ? "step" : undefined}
            className={cn("flex-1 rounded-lg px-1 py-2 text-center text-sm font-bold",
              i === stepIndex ? "bg-paddy-d text-white" : i < stepIndex ? "bg-mist text-paddy-d" : "border border-line text-sub")}>
            {i + 1}. {s.label}
          </li>
        ))}
      </ol>

      {step === "condition" && (
        <Card>
          <h2 className="text-lg font-bold">Is your palay fresh or dry?</h2>
          <p className="text-sm text-sub">Prices per kg{palayPrices.updated !== "Not available" ? ` as of ${palayPrices.updated}` : ""}.</p>
          {Object.values(PalayCondition).map((c) => {
            const p = price(c);
            return (
              <button key={c} type="button" disabled={p === null} aria-pressed={condition === c}
                onClick={() => setCondition(c)}
                className={cn("flex min-h-16 items-center justify-between gap-3 rounded-xl border-2 p-4 text-left disabled:opacity-50",
                  condition === c ? "border-paddy-d bg-mist" : "border-line bg-white")}>
                <span><span className="block font-bold">{conditionLabel[c]}</span><span className="text-sm text-sub">{conditionHint[c]}</span></span>
                <span className="text-lg font-bold">{p === null ? "Not available" : `${peso(p)}/kg`}</span>
              </button>
            );
          })}
          <Button disabled={!condition} onClick={() => setStep("details")}>Next</Button>
        </Card>
      )}

      {step === "details" && (
        <Card>
          <h2 className="text-lg font-bold">Your palay details</h2>
          <TextField label="Quantity (kg)" type="number" inputMode="decimal" min={1} step="any" value={kg}
            error={touched ? errors.kg : undefined}
            hint={amount > 0 ? `About ${(amount / 50).toFixed(1)} sacks of 50 kg. The final weight is confirmed at IRPC.` : "Your best estimate. IRPC weighs it on arrival."}
            onChange={(e) => setKg(e.target.value)} />
          <SelectField label="Rice variety" value={varietyChoice} onChange={(e) => setVarietyChoice(e.target.value)}>
            <option value="">Choose a variety</option>
            {riceTypes.map((rice) => <option key={rice.id} value={rice.name}>{rice.name}</option>)}
            <option value={OTHER}>Other (type it yourself)</option>
          </SelectField>
          {touched && errors.variety && !isOther && <p className="-mt-3 text-sm font-bold text-clay">{errors.variety}</p>}
          {isOther && (
            <TextField label="Your rice variety" value={otherVariety} placeholder="e.g. Rc222 or Dinorado"
              error={touched ? errors.variety : undefined} onChange={(e) => setOtherVariety(e.target.value)} />
          )}
          <fieldset className="flex flex-col gap-2">
            <legend className="font-bold">How will it reach IRPC?</legend>
            {Object.values(DeliveryMethod).map((d) => (
              <button key={d} type="button" aria-pressed={delivery === d} onClick={() => setDelivery(d)}
                className={cn("min-h-12 rounded-xl border-2 px-4 text-left font-bold",
                  delivery === d ? "border-paddy-d bg-mist" : "border-line bg-white")}>
                {deliveryLabel[d]}
              </button>
            ))}
            {touched && errors.delivery && <p className="text-sm font-bold text-clay">{errors.delivery}</p>}
          </fieldset>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep("condition")}>Back</Button>
            <Button className="flex-1" onClick={() => { setTouched(true); if (detailsOk) setStep("review"); }}>Review</Button>
          </div>
        </Card>
      )}

      {step === "review" && condition && delivery && (
        <Card>
          <h2 className="text-lg font-bold">Check your request</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            <dt className="text-sub">Palay</dt><dd className="text-right font-bold">{conditionLabel[condition]}</dd>
            <dt className="text-sub">Variety</dt><dd className="text-right font-bold">{variety.trim()}</dd>
            <dt className="text-sub">Quantity</dt><dd className="text-right font-bold">{kgf(amount)}</dd>
            <dt className="text-sub">Price</dt><dd className="text-right font-bold">{rate === null ? "Not available" : `${peso(rate)}/kg`}</dd>
            <dt className="text-sub">Delivery</dt><dd className="text-right font-bold">{deliveryLabel[delivery]}</dd>
            <dt className="text-sub">Seller</dt><dd className="text-right font-bold">{profile.name}</dd>
          </dl>
          <div className="rounded-xl bg-mist p-4">
            <p className="text-sm text-sub">Estimated payout</p>
            <p className="text-3xl font-bold text-paddy-d">{payout === null ? "Not available" : peso(payout)}</p>
            <p className="mt-1 text-sm text-sub">This is an estimate. You are paid for the weight IRPC records, and you confirm that weight first.</p>
          </div>
          {orderError && <p role="alert" className="font-bold text-clay">{orderError}</p>}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep("details")}>Back</Button>
            <Button className="flex-1" disabled={payout === null} onClick={submit}>Send request</Button>
          </div>
        </Card>
      )}

      {step === "done" && (
        <Card>
          <div role="status">
            <h2 className="text-lg font-bold text-paddy-d">Request {ref} sent</h2>
            <p className="mt-1 text-sub">IRPC will review it and confirm your date. Watch the status in My orders.{isMock ? " This demo does not send SMS." : ""}</p>
          </div>
          <Link href="/buyer/orders" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-paddy-d px-5 font-bold text-white">Go to My orders</Link>
          <Button variant="ghost" onClick={reset}>Sell more palay</Button>
        </Card>
      )}
    </div>
  );
}
