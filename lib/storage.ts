"use client";

import { defaultData, isActive, isData, isPlan, isPrefs, isRecord, mergeBackup, mergeHistory, type Backup, type StoredData } from "./data";
import type { ActiveSession, Prefs, SessionPlan, SessionRecord } from "./types";
import { createSession, finishRecord } from "./session";

const DATA_KEY = "showup.data.v2";

/** Legacy keys are read without being rewritten or removed. One v2 write is atomic. */
export function loadData(persistLegacy = true): StoredData {
  if (typeof window === "undefined") return defaultData();
  let raw: string | null;
  try { raw = localStorage.getItem(DATA_KEY); } catch { throw new Error("This browser could not read your saved workouts. Check its storage settings."); }
  try {
    if (raw !== null) {
      const data: unknown = JSON.parse(raw);
      if (!isData(data)) throw new Error();
      const legacyRaw = localStorage.getItem("showup.history.v1");
      if (legacyRaw !== null) {
        const legacy: unknown = JSON.parse(legacyRaw);
        if (!Array.isArray(legacy) || !legacy.every(isRecord)) throw new Error();
        const seen = new Set(data.legacyHistoryIds ?? []);
        const added = legacy.filter(record => !seen.has(record.id));
        if (added.length) {
          data.history = mergeHistory(data.history, added);
          data.legacyHistoryIds = [...new Set([...seen, ...legacy.map(record => record.id)])];
          // An older cached tab may still finish workouts into v1. Import once,
          // and retain seen IDs even after an explicit clear to avoid resurrection.
          if (persistLegacy) saveData(data);
        }
      }
      return data;
    }
    const data = defaultData();
    const prefs = localStorage.getItem("showup.prefs.v1");
    const history = localStorage.getItem("showup.history.v1");
    const plan = localStorage.getItem("showup.plan.v1");
    if (prefs !== null) { const value: unknown = JSON.parse(prefs); if (!isPrefs(value)) throw new Error(); data.prefs = value; }
    if (history !== null) { const value: unknown = JSON.parse(history); if (!Array.isArray(value) || !value.every(isRecord)) throw new Error(); data.history = mergeHistory([], value); data.legacyHistoryIds = value.map(record => record.id); }
    if (plan !== null) { const value: unknown = JSON.parse(plan); if (value !== null && !isPlan(value)) throw new Error(); data.plan = value; }
    return data;
  } catch { throw new Error("Saved workout data could not be read. It has been left unchanged."); }
}

function saveData(data: StoredData): void {
  if (!isData(data)) throw new Error("The workout could not be saved because its data is incomplete.");
  try { localStorage.setItem(DATA_KEY, JSON.stringify(data)); }
  catch { throw new Error("Your browser could not save this change. Your last saved data is intact; keep this workout open and try again."); }
}

export const loadPrefs = (): Prefs => loadData().prefs;
export const loadPlan = (): SessionPlan | null => loadData().plan;
export const loadActive = (): ActiveSession | null => loadData().active;
export const loadHistory = (): SessionRecord[] => loadData().history;
export function savePrefs(prefs: Prefs): void { saveData({ ...loadData(), prefs }); }
export function savePlan(plan: SessionPlan | null): void { saveData({ ...loadData(), plan, active: null }); }
export function beginWorkout(plan: SessionPlan, prefs: Prefs, now = Date.now()): void {
  const data = loadData();
  const history = data.active?.logs.some(row => row.some(log => log.done))
    ? mergeHistory(data.history, [finishRecord({ ...data.active, endedEarly: true }, now)]) : data.history;
  const active = createSession(plan, crypto.randomUUID(), now);
  saveData({ ...data, history, prefs, plan, active });
}
export function saveActive(active: ActiveSession): ActiveSession {
  if (!isActive(active)) throw new Error("The active workout is incomplete.");
  const data = loadData();
  const conflict = "This workout changed in another tab. Your visible sets are still here. Reload to open the saved workout before continuing.";
  if (data.history.some(record => record.id === active.id)) throw new Error(conflict);
  if (data.active) {
    if (data.active.id !== active.id || (data.active.revision ?? 0) !== (active.revision ?? 0)) throw new Error(conflict);
  } else if (!data.plan || data.plan.createdAt !== active.plan.createdAt) throw new Error(conflict);
  const saved = { ...active, revision: (active.revision ?? 0) + 1 };
  saveData({ ...data, plan: saved.plan, active: saved });
  return saved;
}
export function finishWorkout(record: SessionRecord, revision?: number): void {
  const data = loadData();
  if (data.history.some(existing => existing.id === record.id)) return;
  if (!data.active || data.active.id !== record.id || (revision !== undefined && (data.active.revision ?? 0) !== revision)) {
    throw new Error("This workout changed in another tab. Reload before finishing; your visible sets have not been discarded.");
  }
  saveData({ ...data, history: mergeHistory(data.history, [record]), plan: null, active: null });
}
export function appendHistory(record: SessionRecord): void {
  const data = loadData();
  saveData({ ...data, history: mergeHistory(data.history, [record]) });
}
export function clearHistory(): void { saveData({ ...loadData(), history: [] }); }
export function exportBackup(): Backup { return { app: "showup", version: 1, exportedAt: Date.now(), data: loadData(false) }; }
export function importBackup(backup: Backup): number {
  const current = loadData();
  const merged = mergeBackup(current, backup);
  saveData(merged);
  return merged.history.length - current.history.length;
}
