"use client";

import { useState } from "react";
import type { PlannedExercise, SetLog } from "@/lib/types";
import { formatSet, type Performance } from "@/lib/performance";

interface Props {
  planned: PlannedExercise;
  logs: SetLog[];
  currentSet: number;
  onComplete: (log: SetLog) => void;
  previous?: Performance;
  disabled?: boolean;
}

export default function SetLogger({ planned, logs, currentSet, onComplete, previous, disabled = false }: Props) {
  const weighted = planned.exercise.weighted;
  const isHold = planned.exercise.id === "plank";
  const repsLabel = isHold ? "Seconds" : "Reps";
  const previousSet = previous?.sets[Math.min(currentSet - 1, previous.sets.length - 1)];
  const lastWeight = logs.findLast?.((l) => l.done)?.weight ?? previousSet?.weight ?? 0;
  const [reps, setReps] = useState<number>(planned.reps);
  const [weight, setWeight] = useState<number>(lastWeight);
  const [rpe, setRpe] = useState("");
  const valid = Number.isFinite(reps) && reps > 0 && reps <= 100000
    && Number.isFinite(weight) && weight >= 0 && weight <= 100000
    && (!rpe || (Number(rpe) >= 1 && Number(rpe) <= 10 && Number.isInteger(Number(rpe) * 2)));

  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="mb-3 text-xs uppercase tracking-widest text-muted">
        Set {currentSet} of {planned.sets}
      </div>
      {previousSet && <p className="mb-3 text-xs text-muted">Last time, this set: <span className="text-white">{formatSet(previousSet, planned.exercise)}</span></p>}
      <fieldset disabled={disabled} className="grid grid-cols-2 gap-3 disabled:opacity-50">
        <label className="flex flex-col gap-1 text-xs text-muted">
          {repsLabel}
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={100000}
            value={reps}
            onChange={(e) => setReps(Number(e.target.value))}
            className="rounded-xl border border-line bg-bg px-4 py-3 text-2xl text-white tabular-nums focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Weight ({weighted ? "kg" : "—"})
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={100000}
            step="any"
            disabled={!weighted}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="rounded-xl border border-line bg-bg px-4 py-3 text-2xl text-white tabular-nums focus:border-accent focus:outline-none disabled:opacity-50"
          />
        </label>
      </fieldset>
      <label className="mt-3 flex items-center justify-between gap-3 text-xs text-muted" htmlFor="set-effort">
        <span>Effort · optional <span className="block mt-1">Your rating: 1 easy, 10 maximal.</span></span>
        <input id="set-effort" type="number" inputMode="decimal" min={1} max={10} step={0.5} placeholder="—" value={rpe} disabled={disabled}
          onChange={event => setRpe(event.target.value)} aria-describedby="effort-help"
          className="w-20 rounded-xl border border-line bg-bg px-3 py-3 text-lg text-white focus:border-accent focus:outline-none" />
      </label>
      <p id="effort-help" className="mt-1 text-xs text-muted">RPE records how hard the set felt. Leave blank if unsure.</p>
      <button
        onClick={() => onComplete({ reps, weight: weighted ? weight : 0, done: true, ...(rpe ? { rpe: Number(rpe) } : {}) })}
        disabled={disabled || !valid}
        className="mt-4 w-full rounded-xl bg-accent py-4 text-base font-semibold text-bg active:scale-[0.99] disabled:opacity-40"
      >
        Log set
      </button>
    </div>
  );
}
