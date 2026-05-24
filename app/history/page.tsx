"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FOCUS_LABEL } from "@/lib/generator";
import { clearHistory, loadHistory } from "@/lib/storage";
import type { SessionRecord } from "@/lib/types";

function formatDate(ms: number) {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function HistoryPage() {
  const [records, setRecords] = useState<SessionRecord[]>([]);

  useEffect(() => {
    setRecords(loadHistory());
  }, []);

  const weekKcal = records
    .filter((r) => r.endedAt > Date.now() - 7 * 24 * 60 * 60 * 1000)
    .reduce((a, r) => a + r.kcal, 0);

  return (
    <main>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/" className="text-xs text-muted">
          ← Back
        </Link>
        {records.length > 0 && (
          <button
            onClick={() => {
              if (confirm("Clear all history?")) {
                clearHistory();
                setRecords([]);
              }
            }}
            className="text-xs text-muted"
          >
            Clear
          </button>
        )}
      </div>

      <h1 className="text-3xl font-bold leading-tight">History</h1>
      <div className="mt-2 text-sm text-muted">
        Last 7 days: <span className="text-white tabular-nums">{weekKcal} kcal</span> ·{" "}
        <span className="text-white tabular-nums">
          {records.filter((r) => r.endedAt > Date.now() - 7 * 24 * 60 * 60 * 1000).length}
        </span>{" "}
        sessions
      </div>

      <ul className="mt-6 space-y-2">
        {records.length === 0 && (
          <li className="rounded-2xl border border-dashed border-line bg-panel px-4 py-10 text-center text-sm text-muted">
            No sessions yet. Show up.
          </li>
        )}
        {records.map((r) => {
          const minutes = Math.round((r.endedAt - r.startedAt) / 60000);
          const sets = r.logs.flat().filter((l) => l.done).length;
          return (
            <li key={r.id} className="rounded-2xl border border-line bg-panel p-4">
              <div className="flex items-baseline justify-between">
                <div className="text-lg font-semibold">{FOCUS_LABEL[r.plan.focus]}</div>
                <div className="text-xs text-muted">{formatDate(r.endedAt)}</div>
              </div>
              <div className="mt-1 text-sm text-muted tabular-nums">
                {minutes}m · {sets} sets · {r.kcal} kcal
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
