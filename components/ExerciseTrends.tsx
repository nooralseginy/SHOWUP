"use client";

import { useState } from "react";
import { exerciseSeries, formatSet } from "@/lib/performance";
import type { Exercise, SessionRecord } from "@/lib/types";

export default function ExerciseTrends({ records }: { records: SessionRecord[] }) {
  const exercises = [...new Map(records.flatMap(record => record.plan.exercises.map(p => [p.exercise.id, p.exercise] as const))).values()]
    .filter(exercise => exerciseSeries(records, exercise).length > 0).sort((a, b) => a.name.localeCompare(b.name));
  const [selectedId, setSelectedId] = useState("");
  const exercise: Exercise | undefined = exercises.find(ex => ex.id === selectedId) ?? exercises[0];
  if (!exercise) return null;
  const points = exerciseSeries(records, exercise).slice(-12);
  const metric = exercise.weighted ? "Top logged load · kg" : exercise.id === "plank" ? "Longest logged hold · seconds" : "Most logged reps in a set";
  const values = points.map(p => exercise.weighted ? p.top.weight : p.top.reps);
  const min = Math.min(...values), max = Math.max(...values);
  const x = (i: number) => points.length === 1 ? 150 : 16 + i / (points.length - 1) * 268;
  const y = (value: number) => max === min ? 62 : 108 - (value - min) / (max - min) * 92;
  const date = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return <section className="mt-6 rounded-2xl border border-line bg-panel p-4" aria-labelledby="exercise-trends-title">
    <h2 id="exercise-trends-title" className="font-semibold">Exercise trends</h2>
    <label className="sr-only" htmlFor="trend-exercise">Choose an exercise</label>
    <select id="trend-exercise" value={exercise.id} onChange={event => setSelectedId(event.target.value)}
      className="mt-3 w-full rounded-xl border border-line bg-bg p-3 text-sm focus:border-accent focus:outline-none">
      {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
    </select>
    <p className="mt-3 text-xs text-muted">{metric}</p>
    {points.length > 1 ? <svg viewBox="0 0 300 125" className="mt-2 w-full text-accent" role="img" aria-label={`${exercise.name}: ${metric}. Exact sets listed below.`}>
      <path d={`M ${points.map((p, i) => `${x(i)},${y(values[i])}`).join(" L ")}`} fill="none" stroke="currentColor" strokeWidth="2" />
      {points.map((p, i) => <circle key={p.sessionId} cx={x(i)} cy={y(values[i])} r="4" fill="currentColor"><title>{date(p.endedAt)}: {formatSet(p.top, exercise)}</title></circle>)}
    </svg> : <p className="my-4 text-sm text-muted">One session logged. Your next one will add a second point.</p>}
    <p className="mt-1 text-xs text-muted">{exercise.weighted ? "Highest completed load each session; reps break ties." : "Completed sets only."} These are your recorded sets, not targets.</p>
    <ol className="mt-3 space-y-2 text-sm">
      {points.slice().reverse().map(p => <li key={p.sessionId} className="flex justify-between gap-3 tabular-nums"><span className="shrink-0 text-muted">{date(p.endedAt)}</span><span className="text-right">{formatSet(p.top, exercise)}</span></li>)}
    </ol>
  </section>;
}
