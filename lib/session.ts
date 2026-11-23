import type { ActiveSession, SessionPlan, SessionRecord, SetLog } from "./types";
import { estimateKcal } from "./calories";

export const emptyLog = (): SetLog => ({ reps: 0, weight: 0, done: false });

export function createSession(plan: SessionPlan, id: string, now = Date.now()): ActiveSession {
  return { id, plan, logs: plan.exercises.map(ex => Array.from({ length: ex.sets }, emptyLog)), startedAt: now,
    phase: "warmup", exerciseIdx: 0, setIdx: 0, resting: false };
}

export function nextOpenSet(plan: SessionPlan, logs: SetLog[][]): { exerciseIdx: number; setIdx: number } | null {
  for (let exerciseIdx = 0; exerciseIdx < plan.exercises.length; exerciseIdx++) {
    for (let setIdx = 0; setIdx < plan.exercises[exerciseIdx].sets; setIdx++) {
      if (!logs[exerciseIdx]?.[setIdx]?.done) return { exerciseIdx, setIdx };
    }
  }
  return null;
}

export function advanceSession(session: ActiveSession): ActiveSession {
  const next = nextOpenSet(session.plan, session.logs);
  return next ? { ...session, ...next, phase: "working", resting: false }
    : { ...session, phase: "cooldown", resting: false };
}

export function logSet(session: ActiveSession, log: SetLog): ActiveSession {
  if (session.phase !== "working" || session.resting || session.logs[session.exerciseIdx]?.[session.setIdx]?.done) return session;
  const logs = session.logs.map(row => row.slice());
  logs[session.exerciseIdx][session.setIdx] = log;
  const next = nextOpenSet(session.plan, logs);
  return { ...session, logs, phase: next ? "working" : "cooldown", resting: !!next };
}

export type ShortMode = "trim" | "main";

/** Remove only unlogged work; sparse or later logged sets always remain in place. */
export function shortenSession(session: ActiveSession, mode: ShortMode): ActiveSession {
  const exercises: SessionPlan["exercises"] = [];
  const logs: SetLog[][] = [];
  session.plan.exercises.forEach((planned, index) => {
    const row = session.logs[index] ?? [];
    const loggedFloor = row.reduce((floor, set, i) => set.done ? i + 1 : floor, 0);
    if (mode === "main" && planned.exercise.tier !== "primary" && loggedFloor === 0) return;
    const sets = mode === "trim" ? Math.max(1, planned.sets - 1, loggedFloor)
      : planned.exercise.tier === "primary" ? planned.sets : loggedFloor;
    exercises.push({ ...planned, sets });
    logs.push(Array.from({ length: sets }, (_, i) => row[i] ? { ...row[i] } : emptyLog()));
  });
  if (!exercises.length) return { ...session, phase: "cooldown", resting: false, endedEarly: true };
  const shortened = { ...session, plan: { ...session.plan, exercises }, logs, resting: false, endedEarly: true };
  return session.phase === "warmup" ? shortened : advanceSession(shortened);
}

export function finishRecord(session: ActiveSession, now = Date.now()): SessionRecord {
  const endedAt = Math.max(now, session.startedAt);
  const activeMs = Math.max(0, (session.pausedAt ?? endedAt) - session.startedAt - (session.pausedMs ?? 0));
  return { id: session.id, plan: session.plan, logs: session.logs, startedAt: session.startedAt, endedAt,
    activeMs, kcal: estimateKcal(session.plan, Math.max(1, Math.round(activeMs / 60000))),
    ...(session.endedEarly ? { endedEarly: true } : {}) };
}

export function pauseSession(session: ActiveSession, now = Date.now()): ActiveSession {
  return session.pausedAt === undefined ? { ...session, pausedAt: Math.max(now, session.startedAt) } : session;
}
export function resumeSession(session: ActiveSession, now = Date.now()): ActiveSession {
  if (session.pausedAt === undefined) return session;
  const { pausedAt, ...rest } = session;
  return { ...rest, pausedMs: (session.pausedMs ?? 0) + Math.max(0, now - pausedAt) };
}
export const durationMs = (record: SessionRecord) => record.activeMs ?? Math.max(0, record.endedAt - record.startedAt);
