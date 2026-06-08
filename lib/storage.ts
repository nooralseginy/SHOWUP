"use client";

import type { Prefs, SessionPlan, SessionRecord } from "./types";

const PREFS_KEY = "showup.prefs.v1";
const PLAN_KEY = "showup.plan.v1";
const HISTORY_KEY = "showup.history.v1";

const DEFAULT_PREFS: Prefs = { bodyweightLb: 165 };

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  return safeParse(localStorage.getItem(PREFS_KEY), DEFAULT_PREFS);
}

export function savePrefs(prefs: Prefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function loadPlan(): SessionPlan | null {
  if (typeof window === "undefined") return null;
  return safeParse<SessionPlan | null>(localStorage.getItem(PLAN_KEY), null);
}

export function savePlan(plan: SessionPlan | null): void {
  if (typeof window === "undefined") return;
  if (plan === null) localStorage.removeItem(PLAN_KEY);
  else localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

export function loadHistory(): SessionRecord[] {
  if (typeof window === "undefined") return [];
  return safeParse<SessionRecord[]>(localStorage.getItem(HISTORY_KEY), []);
}

export function appendHistory(record: SessionRecord): void {
  if (typeof window === "undefined") return;
  const list = loadHistory();
  list.unshift(record);
  // Cap at 50 to keep storage modest
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 50)));
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HISTORY_KEY);
}
