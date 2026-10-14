import { STAGES, type Batch } from "@/lib/data";

export default function BatchTimeline({ batch }: { batch: Batch }) {
  return (
    <ol className="flex flex-col">
      {STAGES.map((s, i) => {
        const e = batch.events.find((x) => x.stage === s);
        const last = i === STAGES.length - 1;
        return (
          <li key={s} className="flex min-h-16 gap-4">
            <div className="flex w-6 flex-col items-center">
              <span aria-hidden className={`h-5 w-5 shrink-0 rounded-full border-[3px] ${e ? "border-mist bg-paddy-d" : "border-paddy-d bg-white"}`} />
              {!last && <span aria-hidden className={`w-0.5 flex-1 ${e ? "bg-paddy" : "bg-line"}`} />}
            </div>
            <div className="flex flex-col pb-3">
              <p className="font-bold">{s} <span className="sr-only">{e ? "(done)" : "(pending)"}</span></p>
              <p className="text-sm text-sub">{e ? `${e.at}. ${e.note}` : "Not yet"}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
