import type { ActiveSession, Exercise, Prefs, SessionPlan, SessionRecord, SetLog } from "./types";

export const MAX_HISTORY = 500;
export interface StoredData { version: 2; prefs: Prefs; history: SessionRecord[]; plan: SessionPlan | null; active: ActiveSession | null; legacyHistoryIds?: string[] }
export interface Backup { app: "showup"; version: 1; exportedAt: number; data: StoredData }
export const defaultData = (): StoredData => ({ version: 2, prefs: { bodyweightKg: 75, units: "kg" }, history: [], plan: null, active: null });

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, max = 200): v is string => typeof v === "string" && v.length > 0 && v.length <= max;
const number = (v: unknown, max = 1e15): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
const integer = (v: unknown, max: number): v is number => number(v, max) && Number.isInteger(v);
const member = (v: unknown, values: string[]) => typeof v === "string" && values.includes(v);
const focus = ["push", "pull", "legs", "upper", "lower", "full", "core", "conditioning"];
const equipment = ["full", "dumbbells", "bodyweight"];
const muscles = ["chest", "shoulders", "triceps", "back", "biceps", "quads", "glutes", "hamstrings", "calves", "core", "cardio"];

export function isPrefs(v: unknown): v is Prefs {
  return object(v) && number(v.bodyweightKg, 10000) && member(v.units, ["kg", "lb"]);
}
function isExercise(v: unknown): v is Exercise {
  return object(v) && text(v.id, 100) && text(v.name) && typeof v.cue === "string" && v.cue.length <= 2000
    && typeof v.weighted === "boolean" && member(v.tier, ["primary", "accessory"])
    && number(v.met, 1000) && number(v.defaultReps, 100000)
    && Array.isArray(v.muscles) && v.muscles.length <= 20 && v.muscles.every(x => member(x, muscles))
    && Array.isArray(v.equipment) && v.equipment.length <= 10 && v.equipment.every(x => member(x, equipment))
    && Array.isArray(v.focuses) && v.focuses.length <= 20 && v.focuses.every(x => member(x, focus));
}
export function isPlan(v: unknown): v is SessionPlan {
  return object(v) && member(v.focus, focus) && member(v.experience, ["beginner", "intermediate", "advanced"])
    && member(v.equipment, equipment) && number(v.totalMinutes, 10000) && number(v.bodyweightKg, 10000)
    && number(v.createdAt) && number(v.warmupSec, 86400) && number(v.cooldownSec, 86400)
    && Array.isArray(v.exercises) && v.exercises.length > 0 && v.exercises.length <= 40
    && v.exercises.every(p => object(p) && isExercise(p.exercise) && integer(p.sets, 100) && p.sets > 0
      && number(p.reps, 100000) && number(p.restSec, 86400));
}
export function isSetLog(v: unknown): v is SetLog {
  return object(v) && number(v.reps, 100000) && number(v.weight, 100000) && typeof v.done === "boolean"
    && (v.rpe === undefined || (number(v.rpe, 10) && v.rpe >= 1 && Number.isInteger(v.rpe * 2)));
}
function isLogs(v: unknown, plan: SessionPlan): v is SetLog[][] {
  return Array.isArray(v) && v.length === plan.exercises.length
    && v.every((row, i) => Array.isArray(row) && row.length === plan.exercises[i].sets && row.every(isSetLog));
}
export function isRecord(v: unknown): v is SessionRecord {
  return object(v) && text(v.id, 100) && isPlan(v.plan) && isLogs(v.logs, v.plan)
    && number(v.startedAt) && number(v.endedAt) && v.endedAt >= v.startedAt && number(v.kcal, 1e8)
    && (v.activeMs === undefined || (number(v.activeMs) && v.activeMs <= v.endedAt - v.startedAt))
    && (v.endedEarly === undefined || typeof v.endedEarly === "boolean");
}
export function isActive(v: unknown): v is ActiveSession {
  return object(v) && text(v.id, 100) && isPlan(v.plan) && isLogs(v.logs, v.plan) && number(v.startedAt)
    && member(v.phase, ["warmup", "working", "cooldown"]) && typeof v.resting === "boolean"
    && (v.revision === undefined || integer(v.revision, 1e12))
    && integer(v.exerciseIdx, v.plan.exercises.length - 1)
    && integer(v.setIdx, v.plan.exercises[v.exerciseIdx].sets - 1)
    && (v.pausedAt === undefined || number(v.pausedAt)) && (v.pausedMs === undefined || number(v.pausedMs))
    && (v.endedEarly === undefined || typeof v.endedEarly === "boolean");
}
export function isData(v: unknown): v is StoredData {
  return object(v) && v.version === 2 && isPrefs(v.prefs) && Array.isArray(v.history)
    && v.history.length <= MAX_HISTORY && v.history.every(isRecord)
    && (v.legacyHistoryIds === undefined || (Array.isArray(v.legacyHistoryIds) && v.legacyHistoryIds.length <= 10000 && v.legacyHistoryIds.every(id => text(id, 100))))
    && (v.plan === null || isPlan(v.plan)) && (v.active === null || isActive(v.active));
}
export function readBackup(raw: string): Backup {
  if (raw.length > 5_000_000) throw new Error("This backup is too large to import.");
  let v: unknown;
  try { v = JSON.parse(raw); } catch { throw new Error("Choose a valid SHOWUP JSON backup."); }
  if (!object(v) || v.app !== "showup") throw new Error("This file is not a SHOWUP backup.");
  if (v.version !== 1) throw new Error("This backup version is not supported. Keep the original file.");
  if (!number(v.exportedAt) || !isData(v.data)) throw new Error("The backup contains invalid or incomplete workout data. Nothing was changed.");
  return v as unknown as Backup;
}
export function mergeHistory(current: SessionRecord[], incoming: SessionRecord[]): SessionRecord[] {
  const map = new Map(incoming.map(record => [record.id, record]));
  // Existing records win: an older backup must not replace a newer local copy.
  current.forEach(record => map.set(record.id, record));
  const history = [...map.values()].sort((a, b) => b.endedAt - a.endedAt || a.id.localeCompare(b.id));
  if (history.length > MAX_HISTORY) throw new Error(`The combined history exceeds ${MAX_HISTORY} sessions. Nothing was changed.`);
  return history;
}
export function mergeBackup(current: StoredData, backup: Backup): StoredData {
  const preserveCurrentWorkout = !!(current.active || current.plan);
  return { version: 2, prefs: backup.data.prefs, history: mergeHistory(current.history, backup.data.history),
    legacyHistoryIds: [...new Set([...(current.legacyHistoryIds ?? []), ...(backup.data.legacyHistoryIds ?? [])])],
    plan: preserveCurrentWorkout ? current.plan : backup.data.active?.plan ?? backup.data.plan,
    active: preserveCurrentWorkout ? current.active : backup.data.active };
}
