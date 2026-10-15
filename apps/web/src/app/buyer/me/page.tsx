"use client";

import { PageHeader, Card } from "@/components/ui";
import { IconUser } from "@/components/icons";
import { useStore } from "@/lib/store";

export default function Me() {
  const { profile } = useStore();
  const accountType = profile.type
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My account" sub="Your details at IRPC." icon={<IconUser className="h-6 w-6" />} />
      <Card>
        <dl className="grid gap-x-4 gap-y-5 sm:grid-cols-[minmax(10rem,auto)_1fr]">
          <dt className="text-sub">Name</dt>
          <dd className="font-bold">{profile.name || "Not set"}</dd>
          <dt className="text-sub">Mobile number</dt>
          <dd className="font-bold">{profile.contact || "Not set"}</dd>
          <dt className="text-sub">Town</dt>
          <dd className="font-bold">{profile.address || "Not set"}</dd>
          <dt className="text-sub">Account type</dt>
          <dd className="font-bold">{accountType}</dd>
        </dl>
        <p className="border-t border-line pt-4 text-sm text-sub">
          To change these details, ask the IRPC staff.
        </p>
      </Card>
    </div>
  );
}
