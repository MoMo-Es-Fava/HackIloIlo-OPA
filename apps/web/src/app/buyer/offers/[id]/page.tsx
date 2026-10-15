"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { estimateOrderAmount, OrderType } from "@irpc/types";
import { useStore } from "@/lib/store";
import { peso, kgf } from "@/lib/format";
import { Button, Card, Empty, PageHeader, TextField } from "@/components/ui";
import { IconChevronRight, IconTrace } from "@/components/icons";

export default function OfferDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { offers, batches, prices, settings, reserveOffer, orderError } = useStore();
  const offer = offers.find((o) => o.id === id);
  const [kg, setKg] = useState("");
  const [review, setReview] = useState(false);

  if (!offer)
    return (
      <Empty>
        Offer not found.{" "}
        <Link href="/buyer/offers" className="font-bold text-paddy-d hover:underline">
          Back to offers
        </Link>
      </Empty>
    );
  const batch = batches.find((b) => b.id === offer.batchId);
  const n = Number(kg);
  const error = kg === "" ? undefined : !(n > 0) ? "Enter a quantity above 0" : n > offer.kgAvailable ? `Only ${kgf(offer.kgAvailable)} available` : undefined;
  const total = settings ? estimateOrderAmount({ type: OrderType.BUY_RICE, requestedKg: kg, riceTypeId: offer.riceTypeId }, prices, settings) : null;
  const valid = kg !== "" && !error && total !== null;

  const confirm = async () => {
    // The shared contract requires preferredDate. IRPC sets the real date when it accepts the order.
    const requestedOn = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
    const orderId = await reserveOffer(offer.id, n, requestedOn);
    if (orderId) router.push(`/buyer/orders/${orderId}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm font-bold text-sub">
        <Link href="/buyer/offers" className="inline-flex min-h-11 items-center hover:text-paddy-d">
          Buy rice
        </Link>
        <IconChevronRight className="h-4 w-4 text-sub/60" />
        <span className="text-ink">{offer.grade}</span>
      </nav>
      <PageHeader title={`${offer.grade}, ${peso(offer.pricePerKg)} per kg`} sub={`${kgf(offer.kgAvailable)} available. ${offer.delivery}.`} />
      <div className="grid gap-4 md:grid-cols-2">
        {offer.batchId && (
          <Card>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-mist text-paddy-d">
                <IconTrace className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-bold tracking-tight">Where it comes from</h2>
            </div>
            <div className="flex flex-col gap-2">
              {batch && <p>Grown by <span className="font-bold">{batch.farmer}</span>, checked by IRPC when it arrived</p>}
              {batch && <p className="tnum">Milled from {kgf(batch.kg)} of {batch.type.toLowerCase()} palay</p>}
              <p className="text-sm text-sub">Batch {offer.batchId}</p>
            </div>
            <Link
              href={`/buyer/trace/${offer.batchId}`}
              className="group mt-1 inline-flex min-h-11 items-center gap-1.5 font-bold text-paddy-d hover:gap-2.5"
            >
              See its full journey
              <IconChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Card>
        )}
        <Card>
          <h2 className="text-lg font-bold tracking-tight">{review ? "Review your reservation" : "Reserve"}</h2>
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
                hint={valid ? `≈ ${(n / 50).toFixed(1)} sacks of 50 kg · Up to ${kgf(offer.kgAvailable)} available` : `Available stock: ${kgf(offer.kgAvailable)}. One sack is about 50 kg.`}
              />
              {valid && (
                <div aria-live="polite" className="rounded-xl border border-paddy/25 bg-paddy/[0.06] p-4">
                  <p className="text-sm text-sub">Estimated order total</p>
                  <p className="tnum text-2xl font-bold tracking-tight text-paddy-d">{peso(total!)}</p>
                  <p className="tnum text-sm text-sub">{kgf(n)} × {peso(offer.pricePerKg)} per kg</p>
                </div>
              )}
              <Button arrow disabled={!valid} onClick={() => setReview(true)}>
                Review order
              </Button>
            </>
          ) : (
            <>
              <p>{kgf(n)} of {offer.grade} at {peso(offer.pricePerKg)} per kg</p>
              <p className="tnum text-2xl font-bold tracking-tight">Estimated total {total === null ? "—" : peso(total)}</p>
              <p className="text-sm text-sub">{offer.delivery}. You can cancel from your order while it is pending.</p>
              {orderError && <p role="alert" className="font-bold text-clay">{orderError}</p>}
              <div className="flex gap-3">
                <Button arrow onClick={confirm}>Confirm reservation</Button>
                <Button variant="ghost" onClick={() => setReview(false)}>Edit</Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
