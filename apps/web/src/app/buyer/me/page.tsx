"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import type { BuyerProfile } from "@/lib/data";
import { Badge, Button, Card, PageHeader, SelectField, TextField } from "@/components/ui";
import { IconUser, IconWrench, IconChevronRight } from "@/components/icons";

export default function Me() {
  const { profile, updateProfile } = useStore();
  const [f, setF] = useState<BuyerProfile>(profile);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof BuyerProfile>(k: K, v: BuyerProfile[K]) => { setF({ ...f, [k]: v }); setSaved(false); };
  const nameErr = f.name.trim() ? undefined : "Name is required";
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Buyer profile" sub={`Account ${profile.id}`} icon={<IconUser className="h-6 w-6" />} />
      <Card>
        <TextField label="Business name" value={f.name} error={nameErr} onChange={(e) => set("name", e.target.value)} />
        <SelectField label="Type" value={f.type} onChange={(e) => set("type", e.target.value as BuyerProfile["type"])}>
          <option>Retailer</option><option>Trader</option><option>Cooperative</option>
        </SelectField>
        <TextField label="Contact number" inputMode="tel" value={f.contact} onChange={(e) => set("contact", e.target.value)} />
        <TextField label="Address" value={f.address} onChange={(e) => set("address", e.target.value)} />
        <div className="flex items-center gap-3">
          <Button disabled={!!nameErr} onClick={() => { updateProfile(f); setSaved(true); }}>
            Save profile
          </Button>
          {saved && <Badge tone="ok">Saved</Badge>}
        </div>
      </Card>
      <Link
        href="/buyer/service"
        className="group flex min-h-14 items-center justify-between rounded-2xl border border-line/80 bg-white p-4 font-bold shadow-card transition-all hover:border-paddy/50 hover:shadow-raised"
      >
        <span className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-mist text-paddy-d">
            <IconWrench className="h-5 w-5" />
          </span>
          Service booking
        </span>
        <IconChevronRight className="h-5 w-5 text-sub/60 transition-transform group-hover:translate-x-0.5 group-hover:text-paddy-d" />
      </Link>
    </div>
  );
}
