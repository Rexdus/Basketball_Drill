import type {
  TrainingActivity,
  TrainingActivityType,
  CheckinInput,
  Equipment,
  Goal,
  Injury,
  Intensity,
  Position,
  Experience,
  RecurringBasketballDays,
} from "./types";

export type BackupAthlete = {
  id: number;
  name: string;
  age: number;
  heightCm: number;
  weightKg: number;
  units?: "metric" | "imperial";
  position: Position;
  experience: Experience;
  goal: Goal;
  daysPerWeek: number;
  minutes: number;
  gameDate: string | null;
  equipment: Equipment[];
  injuries: Injury[];
  notes: string | null;
  publicId: string;
  recurringBasketballDays?: RecurringBasketballDays;
  isDemo?: boolean;
  updatedAt: string;
};

export type BackupData = {
  athlete: BackupAthlete | null;
  checkins: (CheckinInput & { date: string; readiness: number })[];
  workouts: unknown[];
  activities: TrainingActivity[];
};

const POSITIONS = ["guard", "wing", "big", "unsure"] as const;
const EXPERIENCES = ["beginner", "intermediate", "advanced"] as const;
const GOALS = ["vertical", "speed", "strength", "conditioning", "skill", "recovery", "balanced"] as const;
const FEELINGS = ["fresh", "good", "okay", "tired", "wrecked"] as const;
const INTENSITIES = ["restore", "maintain", "build", "peak"] as const;
const STATUSES = ["planned", "completed", "skipped"] as const;
const CATEGORIES = ["warmup", "mobility", "plyo", "power", "strength", "agility", "conditioning", "skill", "core", "recovery"] as const;
const EQUIPMENT = ["bodyweight", "dumbbells", "bands", "barbell", "medicine-ball", "box", "ball", "hoop", "court"] as const;
const INJURIES = ["knee", "ankle", "back", "shoulder", "hamstring"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isFiniteNumber(value: unknown, min = -Infinity, max = Infinity): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function isEnumValue<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function isDateString(value: unknown): value is string {
  if (!isString(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validRecurringDays(value: unknown): value is RecurringBasketballDays {
  if (!isRecord(value)) return false;
  return [value.practiceDays, value.gameDays].every(
    (days) => Array.isArray(days) && days.every((day) => isFiniteNumber(day, 0, 6) && Number.isInteger(day)),
  );
}

function validAthlete(value: unknown): value is BackupAthlete {
  if (!isRecord(value)) return false;
  return (
    isFiniteNumber(value.id, 1) && isString(value.name) && value.name.length <= 100 &&
    isFiniteNumber(value.age, 10, 80) && isFiniteNumber(value.heightCm, 120, 230) &&
    isFiniteNumber(value.weightKg, 35, 200) && (value.units === undefined || isEnumValue(value.units, ["metric", "imperial"])) &&
    isEnumValue(value.position, POSITIONS) && isEnumValue(value.experience, EXPERIENCES) &&
    isEnumValue(value.goal, GOALS) && isFiniteNumber(value.daysPerWeek, 1, 7) &&
    isFiniteNumber(value.minutes, 20, 120) && (value.gameDate === null || isDateString(value.gameDate)) &&
    Array.isArray(value.equipment) && value.equipment.every((item) => isEnumValue(item, EQUIPMENT)) &&
    Array.isArray(value.injuries) && value.injuries.every((item) => isEnumValue(item, INJURIES)) &&
    (value.recurringBasketballDays === undefined || validRecurringDays(value.recurringBasketballDays)) &&
    (value.notes === null || isString(value.notes)) && isString(value.publicId) && isString(value.updatedAt)
  );
}

function validCheckin(value: unknown): value is BackupData["checkins"][number] {
  if (!isRecord(value)) return false;
  return (
    isDateString(value.date) && isFiniteNumber(value.sleepHours, 0, 14) &&
    isFiniteNumber(value.energy, 1, 5) && isFiniteNumber(value.soreness, 1, 5) &&
    isFiniteNumber(value.stress, 1, 5) && isFiniteNumber(value.hydration, 1, 5) &&
    isEnumValue(value.feeling, FEELINGS) && Array.isArray(value.soreAreas) &&
    value.soreAreas.every((area) => isString(area) && area.length <= 60) &&
    (value.notes === undefined || (isString(value.notes) && value.notes.length <= 1000)) &&
    isFiniteNumber(value.readiness, 0, 100)
  );
}

function validActivity(value: unknown): value is TrainingActivity {
  if (!isRecord(value)) return false;
  return isString(value.id) && isDateString(value.date) &&
    isEnumValue<TrainingActivityType>(value.type, ["practice", "pickup", "game", "indoor-bike", "outdoor-bike"]) &&
    isFiniteNumber(value.durationMin, 5, 360) && Number.isInteger(value.durationMin) &&
    isFiniteNumber(value.rpe, 1, 10) && Number.isInteger(value.rpe) &&
    (value.distanceKm === undefined || value.distanceKm === null || isFiniteNumber(value.distanceKm, 0, 1000)) &&
    (value.notes === null || (isString(value.notes) && value.notes.length <= 300)) &&
    isString(value.createdAt) && Number.isFinite(Date.parse(value.createdAt));
}

function validPrescription(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isString(value.name) && isString(value.dose) && isString(value.cue) && isEnumValue(value.category, CATEGORIES) &&
    (value.load === undefined || isString(value.load)) && (value.rest === undefined || isString(value.rest));
}

function validWorkoutPlan(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.blocks)) return false;
  const validBlocks = value.blocks.every((block) => {
    if (!isRecord(block) || !Array.isArray(block.exercises)) return false;
    return isString(block.id) && isString(block.title) &&
      (isEnumValue(block.type, CATEGORIES) || block.type === "mixed") &&
      isFiniteNumber(block.durationMin, 0, 180) && isString(block.intent) && block.exercises.every(validPrescription);
  });
  return isString(value.title) && isEnumValue(value.focus, GOALS) && isString(value.phase) &&
    isEnumValue(value.intensity, INTENSITIES) && isFiniteNumber(value.readinessScore, 0, 100) &&
    isString(value.readinessLabel) && isFiniteNumber(value.durationMin, 0, 180) &&
    isFiniteNumber(value.loadScore, 0, 100) && isString(value.summary) && validBlocks &&
    Array.isArray(value.whyThis) && value.whyThis.every(isString) &&
    Array.isArray(value.cautions) && value.cautions.every(isString) &&
    isRecord(value.nutrition) && isFiniteNumber(value.nutrition.waterMl, 0, 10000) &&
    isFiniteNumber(value.nutrition.proteinG, 0, 500) && isFiniteNumber(value.nutrition.carbsG, 0, 1000) &&
    isString(value.nutrition.recoveryTip) && isString(value.nutrition.gameDayTip) && isString(value.finisher) &&
    (value.isRestDay === undefined || typeof value.isRestDay === "boolean");
}

function validWorkout(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isFiniteNumber(value.id, 1) && isDateString(value.date) && isString(value.title) &&
    isEnumValue(value.focus, GOALS) && isString(value.phase) && isEnumValue(value.intensity, INTENSITIES) &&
    isFiniteNumber(value.durationMin, 0, 180) && isFiniteNumber(value.loadScore, 0, 100) &&
    isFiniteNumber(value.readinessScore, 0, 100) && validWorkoutPlan(value.plan) &&
    isEnumValue(value.status, STATUSES) && (value.rpe === null || isFiniteNumber(value.rpe, 1, 10)) &&
    (value.feedback === null || isString(value.feedback)) &&
    (value.completedAt === null || (isString(value.completedAt) && Number.isFinite(Date.parse(value.completedAt))));
}

export function parseBackup(json: string): { ok: true; data: BackupData } | { ok: false; message: string } {
  if (json.length > 4_000_000) return { ok: false, message: "That backup is too large to import safely (maximum 4 MB)." };
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, message: "Couldn't read that file. Export a fresh CourtReady backup and try again." };
  }
  if (!isRecord(data) || data.app !== "courtready" || data.version !== 1) {
    return { ok: false, message: "This isn't a supported CourtReady backup version." };
  }
  const activities = data.activities === undefined ? [] : data.activities;
  if (!(data.athlete === null || validAthlete(data.athlete)) || !Array.isArray(data.checkins) ||
      !data.checkins.every(validCheckin) || !Array.isArray(data.workouts) || !data.workouts.every(validWorkout) ||
      !Array.isArray(activities) || !activities.every(validActivity) ||
      data.checkins.length > 10_000 || data.workouts.length > 10_000 || activities.length > 10_000) {
    return { ok: false, message: "The backup contains incomplete or invalid profile, check-in, or workout data." };
  }
  return {
    ok: true,
    data: {
      athlete: data.athlete,
      checkins: data.checkins,
      workouts: data.workouts,
      activities,
    },
  };
}

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Run a series of browser-storage writes as one rollback-capable transaction. */
export function runStorageTransaction(storage: StorageLike, keys: string[], action: () => void): boolean {
  let previous: (string | null)[];
  try {
    previous = keys.map((key) => storage.getItem(key));
    action();
    return true;
  } catch {
    keys.forEach((key, index) => {
      try {
        const value = previous?.[index] ?? null;
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
      } catch {
        // If storage itself is unavailable, preserve the original failure result.
      }
    });
    return false;
  }
}
