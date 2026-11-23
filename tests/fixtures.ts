import type { Exercise, SessionPlan, SessionRecord } from "../lib/types";
export const lift: Exercise = { id: "bench", name: "Bench press", muscles: ["chest"], equipment: ["full"], focuses: ["push"], tier: "primary", met: 5, cue: "Keep control.", defaultReps: 10, weighted: true };
export const accessory: Exercise = { ...lift, id: "push-up", name: "Push-up", tier: "accessory", weighted: false };
export const plan = (): SessionPlan => ({ focus: "push", experience: "intermediate", equipment: "full", totalMinutes: 30, warmupSec: 120, cooldownSec: 90, bodyweightKg: 75, createdAt: 1000,
  exercises: [lift, accessory].map(exercise => ({ exercise: { ...exercise }, sets: 3, reps: 10, restSec: 75 })) });
export function record(id = "old", endedAt = 2000): SessionRecord {
  return { id, plan: plan(), logs: [[{ reps: 10, weight: 40, done: true }, { reps: 8, weight: 45, done: true }, { reps: 0, weight: 0, done: false }],
    [{ reps: 12, weight: 0, done: true }, { reps: 0, weight: 0, done: false }, { reps: 0, weight: 0, done: false }]], startedAt: 1000, endedAt, kcal: 100 };
}
export class MemoryStorage implements Storage {
  data = new Map<string, string>();
  failRead = false;
  failWrite = false;
  writes = 0;
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  getItem(key: string) { if (this.failRead) throw new Error("blocked"); return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { if (this.failWrite) throw new DOMException("Full", "QuotaExceededError"); this.writes++; this.data.set(key, String(value)); }
  removeItem(key: string) { this.data.delete(key); }
}
export function browser(): MemoryStorage {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
  return storage;
}
