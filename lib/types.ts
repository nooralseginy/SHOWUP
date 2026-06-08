export type Focus =
  | "push"
  | "pull"
  | "legs"
  | "upper"
  | "lower"
  | "full"
  | "core"
  | "conditioning";

export type Equipment = "full" | "dumbbells" | "bodyweight";
export type Experience = "beginner" | "intermediate" | "advanced";

export type Muscle =
  | "chest"
  | "shoulders"
  | "triceps"
  | "back"
  | "biceps"
  | "quads"
  | "glutes"
  | "hamstrings"
  | "calves"
  | "core"
  | "cardio";

export interface Exercise {
  id: string;
  name: string;
  muscles: Muscle[];
  equipment: Equipment[];
  focuses: Focus[];
  tier: "primary" | "accessory";
  met: number;
  cue: string;
  defaultReps: number;
  weighted: boolean;
}

export interface PlannedExercise {
  exercise: Exercise;
  sets: number;
  reps: number;
  restSec: number;
}

export interface SetLog {
  reps: number;
  weight: number;
  done: boolean;
}

export interface SessionPlan {
  focus: Focus;
  experience: Experience;
  equipment: Equipment;
  totalMinutes: number;
  warmupSec: number;
  cooldownSec: number;
  bodyweightLb: number;
  exercises: PlannedExercise[];
  createdAt: number;
}

export interface SessionRecord {
  id: string;
  plan: SessionPlan;
  logs: SetLog[][];
  startedAt: number;
  endedAt: number;
  kcal: number;
}

export interface Prefs {
  bodyweightLb: number;
}
