export type Position = "guard" | "wing" | "big" | "unsure";
export type Units = "metric" | "imperial";
export type Experience = "beginner" | "intermediate" | "advanced";
export type Goal = "vertical" | "speed" | "strength" | "conditioning" | "skill" | "recovery" | "balanced";
export type Feeling = "fresh" | "good" | "okay" | "tired" | "wrecked";
export type Equipment =
  | "bodyweight"
  | "dumbbells"
  | "bands"
  | "barbell"
  | "medicine-ball"
  | "box"
  | "ball"
  | "hoop"
  | "court";
export type Injury = "knee" | "ankle" | "back" | "shoulder" | "hamstring";
export type BasketballActivityType = "practice" | "pickup" | "game";

/** Weekday indices use Monday=0 through Sunday=6. */
export type RecurringBasketballDays = {
  practiceDays: number[];
  gameDays: number[];
};

export type BasketballActivity = {
  id: string;
  date: string;
  type: BasketballActivityType;
  durationMin: number;
  rpe: number;
  notes: string | null;
  createdAt: string;
};
export type Category =
  | "warmup"
  | "mobility"
  | "plyo"
  | "power"
  | "strength"
  | "agility"
  | "conditioning"
  | "skill"
  | "core"
  | "recovery";
export type Intensity = "restore" | "maintain" | "build" | "peak";

export type AthleteProfile = {
  id: number;
  name: string;
  age: number;
  // Measurements are always stored canonically in metric (cm / kg) — the
  // engine works in those units. `units` only controls how the UI shows them.
  heightCm: number;
  weightKg: number;
  units: Units;
  position: Position;
  experience: Experience;
  goal: Goal;
  daysPerWeek: number;
  /** Recurring on-court commitments; gym sessions are scheduled on other days. */
  recurringBasketballDays?: RecurringBasketballDays;
  minutes: number;
  gameDate: string | null;
  equipment: Equipment[];
  injuries: Injury[];
  notes: string | null;
};

export type CheckinInput = {
  sleepHours: number;
  energy: number;
  soreness: number;
  stress: number;
  hydration: number;
  feeling: Feeling;
  soreAreas: string[];
  notes?: string;
};

export type Prescription = {
  name: string;
  dose: string;
  load?: string;
  rest?: string;
  cue: string;
  category: Category;
};

export type WorkoutBlock = {
  id: string;
  title: string;
  type: Category | "mixed";
  durationMin: number;
  intent: string;
  exercises: Prescription[];
};

export type NutritionPlan = {
  waterMl: number;
  proteinG: number;
  carbsG: number;
  recoveryTip: string;
  gameDayTip: string;
};

export type WorkoutPlan = {
  title: string;
  focus: Goal;
  phase: string;
  intensity: Intensity;
  readinessScore: number;
  readinessLabel: string;
  durationMin: number;
  loadScore: number;
  summary: string;
  blocks: WorkoutBlock[];
  whyThis: string[];
  cautions: string[];
  nutrition: NutritionPlan;
  finisher: string;
  /** Scheduled off-day marker. Off days are not loggable training sessions. */
  isRestDay?: boolean;
};

export const POSITION_LABELS: Record<Position, string> = {
  guard: "Guard",
  wing: "Wing",
  big: "Big",
  unsure: "Not sure yet",
};

export const EXPERIENCE_LABELS: Record<Experience, string> = {
  beginner: "Beginner · < 1 year",
  intermediate: "Intermediate · 1–4 years",
  advanced: "Advanced · 4+ years",
};

export const GOAL_LABELS: Record<Goal, string> = {
  vertical: "Bounce / vertical jump",
  speed: "First-step speed & agility",
  strength: "Strength & durability",
  conditioning: "Game conditioning",
  skill: "Skill & touch",
  recovery: "Recovery & mobility",
  balanced: "All-around hooper",
};

export const FEELING_LABELS: Record<Feeling, string> = {
  fresh: "Fresh — bouncing off the walls",
  good: "Good — ready to work",
  okay: "Okay — nothing special",
  tired: "Tired — legs feel heavy",
  wrecked: "Wrecked — running on empty",
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  bodyweight: "Bodyweight only",
  dumbbells: "Dumbbells",
  bands: "Resistance bands",
  barbell: "Barbell / rack",
  "medicine-ball": "Medicine ball",
  box: "Box / bench",
  ball: "Basketball",
  hoop: "Hoops access",
  court: "Full court",
};

export const INJURY_LABELS: Record<Injury, string> = {
  knee: "Knees",
  ankle: "Ankles",
  back: "Lower back",
  shoulder: "Shoulders",
  hamstring: "Hamstrings",
};

export const SORE_AREAS = ["Quads", "Hamstrings", "Calves", "Knees", "Ankles", "Lower back", "Shoulders", "Core"];

export const INTENSITY_LABELS: Record<Intensity, string> = {
  restore: "Restore",
  maintain: "Maintain",
  build: "Build",
  peak: "Peak",
};

export type PlanDay = {
  date: string;
  weekday: string;
  daysToGame: number | null;
  phase: string;
  focus: Goal;
  title: string;
  intensity: Intensity;
  durationMin: number;
  loadScore: number;
  isToday: boolean;
  status: string;
};
