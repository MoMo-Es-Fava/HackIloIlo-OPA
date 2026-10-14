"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { peso, kgf } from "@/lib/format";
import { Button, Card, Empty, PageHeader, TextField } from "@/components/ui";

export default function OfferDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { offers, batches, reserveOffer, orderError } = useStore();
  const offer = offers.find((o) => o.id === id);
  const [kg, setKg] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [review, setReview] = useState(false);

  if (!offer) return <Empty>Offer not found. <Link href="/buyer/offers" className="font-bold underline">Back to offers</Link></Empty>;
  const batch = batches.find((b) => b.id === offer.batchId);
  const n = Number(kg);
  const error = kg === "" ? undefined : !(n > 0) ? "Enter a quantity above 0" : n > offer.kgAvailable ? `Only ${kgf(offer.kgAvailable)} available` : undefined;
  const valid = kg !== "" && !error && Boolean(preferredDate);

  const confirm = async () => {
    const orderId = await reserveOffer(offer.id, n, preferredDate);
    if (orderId) router.push(`/buyer/orders/${orderId}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <Link href="/buyer/offers" className="min-h-11 py-2 font-bold text-sky-d underline">Back to offers</Link>
      <PageHeader title={`${offer.grade}, ${peso(offer.pricePerKg)} per kg`} sub={`${kgf(offer.kgAvailable)} available. ${offer.delivery}.`} />
      <div className="grid gap-4 md:grid-cols-2">
        {offer.batchId && <Card>
          <h2 className="text-lg font-bold">Where it comes from</h2>
          <p>Batch <Link className="font-bold underline" href={`/buyer/trace/${offer.batchId}`}>{offer.batchId}</Link></p>
          {batch && <p>Origin: {batch.farmerId}, validated at intake</p>}
          {batch && <p>Source weight: {kgf(batch.kg)} ({batch.type.toLowerCase()} palay)</p>}
          <Link href={`/buyer/trace/${offer.batchId}`} className="min-h-11 py-2 font-bold text-sky-d underline">View full trace</Link>
        </Card>}
        <Card>
          <h2 className="text-lg font-bold">{review ? "Review your reservation" : "Reserve"}</h2>
          {!review ? (
            <>
              <TextField
                label="How many kilograms?"
                type="number"
                inputMode="decimal"
                min={1}
                max={offer.kgAvailable}
                step="any"
                value={kg}
                onChange={(e) => setKg(e.target.value)}
                error={error}
                hint={valid ? `About ${(n / 50).toFixed(1)} 50 kg sacks · Up to ${kgf(offer.kgAvailable)} available` : `Available stock: ${kgf(offer.kgAvailable)}. One 50 kg sack is a useful estimate.`}
              />
              <TextField label="Preferred pickup date" type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
              {valid && (
                <div aria-live="polite" className="rounded-xl bg-mist p-4">
                  <p className="text-sm text-sub">Estimated order total</p>
                  <p className="text-2xl font-bold text-paddy-d">{peso(n * offer.pricePerKg)}</p>
                  <p className="text-sm text-sub">{kgf(n)} × {peso(offer.pricePerKg)} per kg</p>
                </div>
              )}
              <Button disabled={!valid} onClick={() => setReview(true)}>Review order</Button>
            </>
          ) : (
            <>
              <p>{kgf(n)} of {offer.grade} at {peso(offer.pricePerKg)} per kg</p>
              <p className="text-2xl font-bold">Estimated total {peso(n * offer.pricePerKg)}</p>
              <p className="text-sm text-sub">{offer.delivery}. You can cancel from your order while it is pending.</p>
              {orderError && <p role="alert" className="text-clay">{orderError}</p>}
              <div className="flex gap-3"><Button onClick={confirm}>Confirm reservation</Button><Button variant="ghost" onClick={() => setReview(false)}>Edit</Button></div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
