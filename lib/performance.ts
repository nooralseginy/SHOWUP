import type { Exercise, SessionRecord, SetLog } from "./types";

export interface Performance {
  sessionId: string;
  endedAt: number;
  sets: SetLog[];
  top: SetLog;
}

export function completedSet(log: SetLog): boolean {
  return log.done && Number.isFinite(log.reps) && log.reps > 0 && Number.isFinite(log.weight) && log.weight >= 0;
}

/** Same exercise ID only: a different movement is not a comparable performance. */
export function exerciseSeries(records: SessionRecord[], exercise: Exercise, before = Date.now() + 1, excludeId?: string): Performance[] {
  return records
    .filter(record => record.id !== excludeId && record.endedAt < before)
    .flatMap(record => {
      const sets = record.plan.exercises.flatMap((planned, index) =>
        planned.exercise.id === exercise.id ? (record.logs[index] ?? []).filter(completedSet) : []);
      const top = topSet(sets, exercise.weighted);
      return top ? [{ sessionId: record.id, endedAt: record.endedAt, sets, top }] : [];
    })
    .sort((a, b) => a.endedAt - b.endedAt || a.sessionId.localeCompare(b.sessionId));
}

export function previousPerformance(records: SessionRecord[], exercise: Exercise, before: number, excludeId?: string): Performance | undefined {
  return exerciseSeries(records, exercise, before, excludeId).at(-1);
}

/** Descriptive only. Highest load, then reps; bodyweight/holds compare reps/seconds. */
export function topSet(logs: SetLog[], weighted: boolean): SetLog | undefined {
  return logs.filter(completedSet).reduce<SetLog | undefined>((best, log) => {
    if (!best) return log;
    if (weighted && log.weight !== best.weight) return log.weight > best.weight ? log : best;
    return log.reps > best.reps ? log : best;
  }, undefined);
}

export function formatSet(log: SetLog, exercise: Exercise): string {
  const work = exercise.id === "plank" ? `${log.reps}s` : exercise.weighted ? `${log.reps} × ${log.weight}kg` : `${log.reps} reps`;
  return log.rpe === undefined ? work : `${work} · effort ${log.rpe}/10`;
}
