"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FOCUS_LABEL } from "@/lib/generator";
import type { SessionRecord } from "@/lib/types";
import { loadHistory } from "@/lib/storage";
import { isRecord } from "@/lib/data";
import { formatSet, topSet, previousPerformance } from "@/lib/performance";
import { durationMs } from "@/lib/session";

export default function SummaryPage() {
  const router = useRouter();
  const [record, setRecord] = useState<SessionRecord | null>(null);
  const [history, setHistory] = useState<SessionRecord[]>([]);

  useEffect(() => {
    try {
      const records = loadHistory();
      setHistory(records);
      const id = new URLSearchParams(window.location.search).get("session");
      const saved = id ? records.find(item => item.id === id) : undefined;
      if (saved) { setRecord(saved); return; }
      const raw = sessionStorage.getItem("showup.summary");
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (isRecord(parsed)) setRecord(parsed);
      else router.replace("/history");
    } catch {
      router.replace("/history");
    }
  }, [router]);

  if (!record) return null;

  const minutes = Math.floor(durationMs(record) / 60000);
  const totalSets = record.logs.flat().filter((l) => l.done).length;
  const totalReps = record.logs.flat().reduce((a, l) => a + (l.done ? l.reps : 0), 0);
  const totalVolume = record.logs.flat().reduce((a, l) => a + (l.done ? l.reps * l.weight : 0), 0);

  return (
    <main>
      <div className="mb-4 text-xs uppercase tracking-[0.25em] text-muted">Done.</div>
      <h1 className="text-3xl font-bold leading-tight">
        {FOCUS_LABEL[record.plan.focus]}
        <br />{minutes < 1 ? "in under 1 min." : `in ${minutes} min.`}
      </h1>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Stat label="Est. calories" value={`${record.kcal}`} suffix="kcal" />
        <Stat label="Sets" value={`${totalSets}`} />
        <Stat label="Reps" value={`${totalReps}`} />
        <Stat label="Volume" value={`${Math.round(totalVolume)}`} suffix="kg" />
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-xs uppercase tracking-widest text-muted">What you hit</h2>
        <ul className="space-y-2">
          {record.plan.exercises.map((p, i) => {
            const sets = record.logs[i] ?? [];
            const completed = sets.filter((s) => s.done);
            const best = topSet(completed, p.exercise.weighted);
            const previous = previousPerformance(history, p.exercise, record.startedAt, record.id);
            return (
              <li key={p.exercise.id + i} className="rounded-2xl border border-line bg-panel p-4">
                <div className="flex justify-between">
                  <div className="font-semibold">{p.exercise.name}</div>
                  <div className="text-sm text-muted tabular-nums">
                    {completed.length}/{p.sets}
                  </div>
                </div>
                {best && (
                  <div className="mt-1 text-sm text-muted tabular-nums">
                    Top logged set: {formatSet(best, p.exercise)}
                  </div>
                )}
                {previous && <p className="mt-1 text-xs text-muted">Last time: {formatSet(previous.top, p.exercise)}</p>}
                {completed.length > 0 && <details className="mt-2 text-xs text-muted"><summary className="cursor-pointer">All logged sets</summary><ol className="mt-2 space-y-1">{completed.map((log, index) => <li key={index}>Set {index + 1}: {formatSet(log, p.exercise)}</li>)}</ol></details>}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md p-4 backdrop-blur">
        <div className="flex gap-2">
          <Link
            href="/history"
            className="shrink-0 rounded-2xl border border-line bg-panel px-4 py-4 text-sm text-muted"
          >
            History
          </Link>
          <Link
            href="/"
            className="flex-1 rounded-2xl bg-accent py-4 text-center text-base font-bold text-bg"
          >
            New session
          </Link>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="text-xs uppercase tracking-widest text-muted">{label}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums">
        {value}
        {suffix ? <span className="ml-1 text-base text-muted">{suffix}</span> : null}
      </div>
    </div>
  );
}
