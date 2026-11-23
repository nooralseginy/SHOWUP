"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FOCUS_LABEL } from "@/lib/generator";
import { clearHistory, loadHistory } from "@/lib/storage";
import { formatSet } from "@/lib/performance";
import { durationMs } from "@/lib/session";
import BackupControls from "@/components/BackupControls";
import ExerciseTrends from "@/components/ExerciseTrends";
import type { SessionRecord } from "@/lib/types";

export default function HistoryPage() {
  const [records, setRecords] = useState<SessionRecord[]>([]);
  const [error, setError] = useState("");
  function refresh() { try { setRecords(loadHistory()); setError(""); } catch (e) { setError((e as Error).message); } }
  useEffect(() => { refresh(); window.addEventListener("storage", refresh); return () => window.removeEventListener("storage", refresh); }, []);
  const week = records.filter(record => record.endedAt <= Date.now() && record.endedAt > Date.now() - 7 * 86400000);

  return <main>
    <div className="mb-4 flex items-center justify-between">
      <Link href="/" className="inline-flex min-h-11 items-center text-xs text-muted">← Back</Link>
      {records.length > 0 && <button className="min-h-11 text-xs text-muted" onClick={() => {
        if (confirm("Clear saved workout history on this device? Export a backup first if you want to keep it.")) {
          try { clearHistory(); refresh(); } catch (e) { setError((e as Error).message); }
        }
      }}>Clear history</button>}
    </div>
    <h1 className="text-3xl font-bold">History</h1>
    <p className="mt-2 text-sm text-muted">Last 7 days: <span className="text-white">{week.length} {week.length === 1 ? "session" : "sessions"}</span> · {week.reduce((sum, r) => sum + r.kcal, 0)} estimated kcal</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    <ExerciseTrends records={records} />
    <BackupControls onRestore={refresh} />
    <h2 className="mt-7 text-xs uppercase tracking-widest text-muted">Sessions</h2>
    {records.length === 0 && !error && <p className="mt-3 rounded-2xl border border-dashed border-line bg-panel px-4 py-8 text-center text-sm text-muted">No sessions yet. Your logged sets will appear here.</p>}
    <ul className="mt-3 space-y-2">{records.map(record => <li key={record.id}>
      <details className="rounded-2xl border border-line bg-panel p-4">
        <summary className="cursor-pointer">
          <span className="font-semibold">{FOCUS_LABEL[record.plan.focus]}</span><span className="ml-2 text-xs text-muted">{new Date(record.endedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
          <span className="mt-1 block text-sm text-muted">{durationMs(record) < 60000 ? "<1m" : `${Math.floor(durationMs(record) / 60000)}m`} · {record.logs.flat().filter(log => log.done).length} {record.logs.flat().filter(log => log.done).length === 1 ? "set" : "sets"}{record.endedEarly ? " · shortened" : ""}</span>
        </summary>
        <ul className="mt-4 space-y-3">{record.plan.exercises.map((planned, i) => <li key={`${planned.exercise.id}-${i}`}>
          <p className="text-sm font-medium">{planned.exercise.name}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{(record.logs[i] ?? []).filter(log => log.done).map(log => formatSet(log, planned.exercise)).join(" / ") || "No sets logged"}</p>
        </li>)}</ul>
      </details>
    </li>)}</ul>
  </main>;
}
