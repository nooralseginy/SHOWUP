import type { Focus, SessionPlan } from "./types";

const BASE_MET_BY_FOCUS: Record<Focus, number> = {
  push: 5.0,
  pull: 5.5,
  legs: 6.0,
  upper: 5.0,
  lower: 6.0,
  full: 5.5,
  core: 4.0,
  conditioning: 8.0,
};

export function estimateKcal(plan: SessionPlan, actualMinutes?: number): number {
  // Blend the plan's focus MET with the average MET of its picked exercises.
  const base = BASE_MET_BY_FOCUS[plan.focus];
  const avg =
    plan.exercises.reduce((acc, p) => acc + p.exercise.met, 0) /
    Math.max(1, plan.exercises.length);
  const met = (base + avg) / 2;
  const minutes = actualMinutes ?? plan.totalMinutes;
  const hours = minutes / 60;
  const bodyweightKg = plan.bodyweightLb / 2.2046;
  return Math.round(met * bodyweightKg * hours);
}
