"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { setAuthToken } from "@/lib/api";
import { useLanguage, LanguageToggle } from "@/lib/language";
import { useStore } from "@/lib/store";
import { AccountType } from "@irpc/types";
import type { BuyerProfile } from "@/lib/demo-types";
import { Badge, Button, Card, PageHeader, SelectField, TextField } from "@/components/ui";
import { IconUser, IconWrench, IconChevronRight } from "@/components/icons";

export default function Me() {
  const { profile, user, isMock, orderError, updateProfile } = useStore();
  const router = useRouter();
  const { t } = useLanguage();
  const [f, setF] = useState<BuyerProfile>(profile);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof BuyerProfile>(k: K, v: BuyerProfile[K]) => { setF({ ...f, [k]: v }); setSaved(false); };
  const nameErr = f.name.trim() ? undefined : "Name is required";
  if (!isMock && user) return <div className="flex flex-col gap-6">
    <PageHeader title={t("My account", "Akon account")} sub={`Account ${user.id}`} icon={<IconUser className="h-6 w-6" />} />
    <Card>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 break-words">
        <dt>{t("Name", "Ngalan")}</dt><dd>{user.name}</dd>
        <dt>{t("Phone", "Cellphone")}</dt><dd>{user.phone}</dd>
        <dt>{t("Account type", "Klase sang account")}</dt><dd>{user.accountType?.replaceAll("_", " ") ?? user.role.replaceAll("_", " ")}</dd>
        <dt>{t("Municipality", "Banwa")}</dt><dd>{user.municipality || "—"}</dd>
        <dt>{t("Cooperative", "Kooperatiba")}</dt><dd>{user.cooperative || "—"}</dd>
        <dt>{t("SMS language", "Lengguwahe sang SMS")}</dt><dd>{user.language === "HIL" ? "Hiligaynon" : "English"}</dd>
      </dl>
      <LanguageToggle />
      <p className="text-sm text-sub">{t("This language switch changes this device's display. Your SMS language is the preference saved at registration.", "Ini nga pili para sa lengguwahe sang sini nga device. Ang lengguwahe sang SMS amo ang ginpili sa pagrehistro.")}</p>
      <Link className="min-h-11 py-3 font-bold text-paddy-d underline" href="/buyer/prices">{t("View current prices", "Tan-awon ang mga presyo")}</Link>
      <Button onClick={() => { setAuthToken(null); router.replace("/login"); }}>{t("Log out", "Mag-log out")}</Button>
    </Card>
  </div>;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Buyer profile" sub={`Account ${profile.id}`} icon={<IconUser className="h-6 w-6" />} />
      <Card>
        <TextField label="Business name" value={f.name} error={nameErr} onChange={(e) => set("name", e.target.value)} />
        <SelectField label="Type" value={f.type} onChange={(e) => set("type", e.target.value as BuyerProfile["type"])}>
          {Object.values(AccountType).map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
        </SelectField>
        <TextField label="Contact number" inputMode="tel" value={f.contact} onChange={(e) => set("contact", e.target.value)} />
        <TextField label="Address" value={f.address} onChange={(e) => set("address", e.target.value)} />
        <div className="flex items-center gap-3">
          <Button
            disabled={!!nameErr || !isMock}
            onClick={async () => { const result = await updateProfile(f); if (result !== null) setSaved(true); }}
          >
            Save profile
          </Button>
          {saved && <Badge tone="ok">Saved</Badge>}
        </div>
        {!isMock && <p>Profile editing is not available yet.</p>}
        {orderError && <p role="alert">{orderError}</p>}
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
