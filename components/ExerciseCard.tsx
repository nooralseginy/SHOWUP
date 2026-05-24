"use client";

import type { PlannedExercise } from "@/lib/types";

interface Props {
  planned: PlannedExercise;
  index: number;
  current?: boolean;
  done?: boolean;
}

export default function ExerciseCard({ planned, index, current, done }: Props) {
  const { exercise, sets, reps } = planned;
  return (
    <div
      className={[
        "rounded-2xl border p-4",
        current
          ? "border-accent bg-panel"
          : done
            ? "border-line bg-panel/50 opacity-60"
            : "border-line bg-panel",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">#{index + 1}</span>
            <span className={["text-xs uppercase tracking-widest", current ? "text-accent" : "text-muted"].join(" ")}>
              {exercise.tier}
            </span>
          </div>
          <div className="mt-1 text-lg font-semibold leading-tight">{exercise.name}</div>
          <div className="mt-1 text-sm text-muted">{exercise.cue}</div>
        </div>
        <div className="shrink-0 rounded-xl border border-line bg-bg px-3 py-2 text-right tabular-nums">
          <div className="text-xs text-muted">Sets × Reps</div>
          <div className="text-base font-semibold">
            {sets} × {reps}
          </div>
        </div>
      </div>
    </div>
  );
}
