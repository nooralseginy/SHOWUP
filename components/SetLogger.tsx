"use client";

import { useState } from "react";
import type { PlannedExercise, SetLog } from "@/lib/types";

interface Props {
  planned: PlannedExercise;
  logs: SetLog[];
  currentSet: number;
  onComplete: (log: SetLog) => void;
}

export default function SetLogger({ planned, logs, currentSet, onComplete }: Props) {
  const weighted = planned.exercise.weighted;
  const isHold = planned.exercise.id === "plank";
  const repsLabel = isHold ? "Seconds" : "Reps";
  const lastWeight = logs.findLast?.((l) => l.done)?.weight ?? logs[logs.length - 1]?.weight ?? 0;
  const [reps, setReps] = useState<number>(planned.reps);
  const [weight, setWeight] = useState<number>(lastWeight);

  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="mb-3 text-xs uppercase tracking-widest text-muted">
        Set {currentSet} of {planned.sets}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          {repsLabel}
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(Number(e.target.value))}
            className="rounded-xl border border-line bg-bg px-4 py-3 text-2xl text-white tabular-nums focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Weight ({weighted ? "lb" : "—"})
          <input
            type="number"
            inputMode="decimal"
            disabled={!weighted}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="rounded-xl border border-line bg-bg px-4 py-3 text-2xl text-white tabular-nums focus:border-accent focus:outline-none disabled:opacity-50"
          />
        </label>
      </div>
      <button
        onClick={() => onComplete({ reps, weight: weighted ? weight : 0, done: true })}
        className="mt-4 w-full rounded-xl bg-accent py-4 text-base font-semibold text-bg active:scale-[0.99]"
      >
        Log set
      </button>
    </div>
  );
}
