import { EXERCISES } from "./exercises";
import type {
  Equipment,
  Exercise,
  Experience,
  Focus,
  PlannedExercise,
  SessionPlan,
} from "./types";

const REST_BY_EXPERIENCE: Record<Experience, number> = {
  beginner: 90,
  intermediate: 75,
  advanced: 60,
};

const SETS_BY_EXPERIENCE: Record<Experience, { primary: number; accessory: number }> = {
  beginner: { primary: 3, accessory: 3 },
  intermediate: { primary: 4, accessory: 3 },
  advanced: { primary: 5, accessory: 3 },
};

const REPS_SHIFT: Record<Experience, number> = {
  beginner: 2, // a touch higher reps
  intermediate: 0,
  advanced: -2, // a touch lower reps for primaries
};

const AVG_SET_SEC = 35; // average time spent doing one set

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function eligible(focus: Focus, equipment: Equipment): Exercise[] {
  return EXERCISES.filter(
    (e) => e.focuses.includes(focus) && e.equipment.includes(equipment),
  );
}

export function generatePlan(opts: {
  focus: Focus;
  experience: Experience;
  equipment: Equipment;
  totalMinutes: number;
  bodyweightLb: number;
}): SessionPlan {
  const { focus, experience, equipment, totalMinutes, bodyweightLb } = opts;

  const warmupSec = Math.max(120, Math.round(totalMinutes * 60 * 0.1));
  const cooldownSec = Math.max(90, Math.round(totalMinutes * 60 * 0.05));
  const workingSec = totalMinutes * 60 - warmupSec - cooldownSec;

  const restSec = REST_BY_EXPERIENCE[experience];
  const setSec = AVG_SET_SEC + restSec;
  const setBudget = Math.max(6, Math.floor(workingSec / setSec));

  const pool = eligible(focus, equipment);
  const primaries = shuffle(pool.filter((e) => e.tier === "primary"));
  const accessories = shuffle(pool.filter((e) => e.tier === "accessory"));

  const setsCfg = SETS_BY_EXPERIENCE[experience];
  const exercises: PlannedExercise[] = [];
  let used = 0;

  const primaryCount = totalMinutes >= 45 ? 2 : 1;
  for (let i = 0; i < primaryCount && i < primaries.length; i++) {
    const ex = primaries[i];
    const sets = setsCfg.primary;
    if (used + sets > setBudget) break;
    exercises.push({
      exercise: ex,
      sets,
      reps: Math.max(3, ex.defaultReps + REPS_SHIFT[experience]),
      restSec,
    });
    used += sets;
  }

  for (const ex of accessories) {
    const sets = setsCfg.accessory;
    if (used + sets > setBudget) break;
    exercises.push({
      exercise: ex,
      sets,
      reps: ex.defaultReps,
      restSec: Math.round(restSec * 0.8),
    });
    used += sets;
  }

  // If nothing was added (very short session), force one primary
  if (exercises.length === 0 && primaries.length > 0) {
    const ex = primaries[0];
    exercises.push({
      exercise: ex,
      sets: 3,
      reps: Math.max(3, ex.defaultReps),
      restSec,
    });
  }

  return {
    focus,
    experience,
    equipment,
    totalMinutes,
    warmupSec,
    cooldownSec,
    bodyweightLb,
    exercises,
    createdAt: Date.now(),
  };
}

export function swapExercise(plan: SessionPlan, index: number): SessionPlan {
  const current = plan.exercises[index];
  if (!current) return plan;
  const inUse = new Set(plan.exercises.map((p) => p.exercise.id));
  const candidates = EXERCISES.filter(
    (e) =>
      e.id !== current.exercise.id &&
      !inUse.has(e.id) &&
      e.tier === current.exercise.tier &&
      e.focuses.includes(plan.focus) &&
      e.equipment.includes(plan.equipment),
  );
  if (candidates.length === 0) return plan;
  const next = candidates[Math.floor(Math.random() * candidates.length)];
  const updated = [...plan.exercises];
  updated[index] = {
    ...current,
    exercise: next,
    reps: Math.max(3, next.defaultReps + (current.exercise.tier === "primary" ? REPS_SHIFT[plan.experience] : 0)),
  };
  return { ...plan, exercises: updated };
}

export const FOCUS_LABEL: Record<Focus, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  upper: "Upper Body",
  lower: "Lower Body",
  full: "Full Body",
  core: "Core",
  conditioning: "Conditioning",
};

export const EXPERIENCE_LABEL: Record<Experience, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  full: "Full gym",
  dumbbells: "Dumbbells only",
  bodyweight: "Bodyweight",
};
