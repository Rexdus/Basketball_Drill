import { DRILLS, type Drill } from "./exercises";
import type {
  AthleteProfile,
  Category,
  CheckinInput,
  Equipment,
  Experience,
  Goal,
  Intensity,
  NutritionPlan,
  PlanDay,
  Prescription,
  WorkoutBlock,
  WorkoutPlan,
} from "./types";

/* ------------------------------------------------------------------ dates */

export function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toISO(date);
}

export function daysBetween(fromISO: string, toISODate: string): number {
  const a = new Date(`${fromISO}T12:00:00`).getTime();
  const b = new Date(`${toISODate}T12:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function weekdayShort(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" });
}

export function prettyDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function daysToGame(profile: Pick<AthleteProfile, "gameDate">, from = todayISO()): number | null {
  if (!profile.gameDate) return null;
  return daysBetween(from, profile.gameDate);
}

/* ------------------------------------------------------------------- math */

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function allocate(weights: number[], total: number): number[] {
  const sum = weights.reduce((acc, w) => acc + w, 0) || 1;
  const raw = weights.map((w) => (w / sum) * total);
  const base = raw.map((n) => Math.max(4, Math.floor(n)));
  let diff = total - base.reduce((acc, n) => acc + n, 0);
  const order = raw
    .map((n, i) => ({ i, frac: n - Math.floor(n) }))
    .sort((a, b) => b.frac - a.frac);
  let cursor = 0;
  while (diff !== 0 && order.length > 0) {
    const target = order[cursor % order.length].i;
    base[target] += diff > 0 ? 1 : -1;
    diff += diff > 0 ? -1 : 1;
    cursor += 1;
    if (cursor > 500) break;
  }
  return base;
}

/* ---------------------------------------------------------------- readiness */

export function readinessLabel(score: number): string {
  if (score >= 85) return "Primed";
  if (score >= 70) return "Ready";
  if (score >= 55) return "Steady";
  if (score >= 40) return "Manage load";
  return "Recover mode";
}

export function computeReadiness(input: CheckinInput, recentHardLoad = 0): number {
  const sleepScore =
    input.sleepHours >= 8
      ? 100
      : input.sleepHours >= 7
        ? 85
        : input.sleepHours >= 6
          ? 66
          : input.sleepHours >= 5
            ? 45
            : 24;
  const energyScore = (input.energy / 5) * 100;
  const sorenessScore = ((6 - input.soreness) / 5) * 100;
  const stressScore = ((6 - input.stress) / 5) * 100;
  const hydrationScore = (input.hydration / 5) * 100;
  const feelingBonus =
    input.feeling === "fresh" ? 6 : input.feeling === "good" ? 2 : input.feeling === "okay" ? 0 : input.feeling === "tired" ? -8 : -16;

  const base =
    sleepScore * 0.26 + energyScore * 0.28 + sorenessScore * 0.22 + stressScore * 0.12 + hydrationScore * 0.12;

  const loadPenalty = Math.min(12, Math.max(0, recentHardLoad) * 1.5);
  return Math.max(8, Math.min(100, Math.round(base + feelingBonus - loadPenalty)));
}

const INTENSITY_RANK: Record<Intensity, number> = { restore: 1, maintain: 2, build: 3, peak: 4 };
const RANK_INTENSITY: Record<number, Intensity> = { 1: "restore", 2: "maintain", 3: "build", 4: "peak" };

function readinessCap(score: number): Intensity {
  if (score >= 82) return "peak";
  if (score >= 68) return "build";
  if (score >= 52) return "maintain";
  return "restore";
}

function bodyMassIndex(profile: AthleteProfile): number {
  const m = profile.heightCm / 100;
  return profile.weightKg / (m * m);
}

export function bmiCategory(profile: Pick<AthleteProfile, "heightCm" | "weightKg">): string {
  const m = profile.heightCm / 100;
  const bmi = profile.weightKg / (m * m);
  if (bmi < 18.5) return "Lean";
  if (bmi < 25) return "Balanced";
  if (bmi < 30) return "Solid";
  return "High impact managed";
}

/* ------------------------------------------------------------------- phase */

type PhaseSpec = {
  name: string;
  intensity: Intensity;
  volume: number;
  focusBias: Goal | null;
};

function calendarPhase(days: number | null, date: string): PhaseSpec {
  if (days === null) {
    const rhythm = Math.abs(daysBetween("2024-01-01", date)) % 4;
    if (rhythm === 3) return { name: "Flush day", intensity: "maintain", volume: 0.62, focusBias: "recovery" };
    return { name: "Development week", intensity: "build", volume: 0.95, focusBias: null };
  }
  if (days <= -2) return { name: "Post-game restore", intensity: "maintain", volume: 0.75, focusBias: "balanced" };
  if (days === -1) return { name: "Post-game flush", intensity: "restore", volume: 0.5, focusBias: "recovery" };
  if (days === 0) return { name: "Game day", intensity: "peak", volume: 0.45, focusBias: "skill" };
  if (days === 1) return { name: "Taper · T-1", intensity: "maintain", volume: 0.5, focusBias: "skill" };
  if (days <= 3) return { name: "Sharpen", intensity: "build", volume: 0.7, focusBias: "speed" };
  if (days <= 6) return { name: "Build to game", intensity: "build", volume: 0.95, focusBias: null };
  return { name: "Develop", intensity: "build", volume: 1, focusBias: null };
}

function chooseFocus(profile: AthleteProfile, phase: PhaseSpec, readiness: number, date: string): Goal {
  if (phase.name === "Game day") return "skill";
  if (phase.focusBias === "recovery" || readiness < 38) return "recovery";
  if (phase.focusBias && ["Taper · T-1", "Sharpen"].includes(phase.name)) return phase.focusBias;
  if (profile.goal === "recovery" && readiness >= 60) return "skill";
  if (profile.goal === "balanced") {
    const rotation: Goal[] = ["strength", "vertical", "speed", "conditioning", "skill"];
    const dayIndex = Math.abs(daysBetween("2024-01-01", date)) % rotation.length;
    return rotation[(dayIndex + (readiness > 75 ? 0 : 2)) % rotation.length];
  }
  return profile.goal;
}

/* --------------------------------------------------------------- selection */

type BlockSpec = { category: Category; title: string; intent: string; weight: number };

const BLOCKS: Record<Category, Omit<BlockSpec, "weight">> = {
  warmup: { title: "Warm-up · raise the temperature", category: "warmup", intent: "Prepare joints, wake the nervous system, no fatigue." },
  mobility: { title: "Mobility · unlock range", category: "mobility", intent: "Access the positions your game demands." },
  plyo: { title: "Jump & land", category: "plyo", intent: "Maximum intent, minimum reps. Stop when output drops." },
  power: { title: "Explode", category: "power", intent: "Fast, violent, full recovery. Speed is the point." },
  strength: { title: "Strength", category: "strength", intent: "Own the movement, then add load. Leave 2 reps in the tank." },
  agility: { title: "Speed & change of direction", category: "agility", intent: "Sharp plants and clean decelerations, game speed." },
  conditioning: { title: "Engine work", category: "conditioning", intent: "Game-paced intervals so the 4th quarter feels familiar." },
  skill: { title: "Skill under control", category: "skill", intent: "Game-speed reps with a scoreboard mindset." },
  core: { title: "Core & anti-rotation", category: "core", intent: "Brace, resist, transfer force. No wasted motion." },
  recovery: { title: "Downshift", category: "recovery", intent: "Bring the nervous system down and restore tissue." },
};

const FOCUS_BLOCKS: Record<Goal, Category[]> = {
  vertical: ["plyo", "strength", "power", "skill", "core"],
  speed: ["agility", "plyo", "strength", "skill", "core"],
  strength: ["strength", "power", "core", "skill"],
  conditioning: ["conditioning", "agility", "skill", "core"],
  skill: ["skill", "agility", "core", "power"],
  recovery: ["mobility", "core", "recovery", "skill"],
  balanced: ["strength", "plyo", "conditioning", "skill", "core"],
};

const FOCUS_TITLES: Record<Goal, string> = {
  vertical: "Bounce day",
  speed: "First-step day",
  strength: "Foundation day",
  conditioning: "Engine day",
  skill: "Touch & IQ day",
  recovery: "Reset day",
  balanced: "Complete hooper day",
};

function impactCap(profile: AthleteProfile, readiness: number, days: number | null): number {
  let cap = 3;
  if (profile.age < 14) cap = 1;
  else if (profile.age < 16) cap = 2;
  else if (profile.age >= 50) cap = 1;
  else if (profile.age >= 40) cap = 2;
  if (bodyMassIndex(profile) >= 33) cap = Math.min(cap, 1);
  else if (bodyMassIndex(profile) >= 29) cap = Math.min(cap, 2);
  if (profile.injuries.some((i) => ["knee", "ankle", "hamstring"].includes(i))) cap = Math.min(cap, 2);
  if (readiness < 50) cap = Math.min(cap, 2);
  if (readiness < 35) cap = Math.min(cap, 1);
  if (days !== null && days >= 0 && days <= 1) cap = Math.min(cap, 1);
  else if (days !== null && days > 1 && days <= 3) cap = Math.min(cap, 2);
  return Math.max(0, cap);
}

function eligible(profile: AthleteProfile, readiness: number, category: Category, days: number | null): Drill[] {
  const gear = new Set<Equipment>([...(profile.equipment ?? []), "bodyweight"]);
  const cap = impactCap(profile, readiness, days);
  return DRILLS.filter((drill) => {
    if (drill.category !== category) return false;
    if (drill.impact > cap) return false;
    if (drill.minAge && profile.age < drill.minAge) return false;
    if (drill.gear.some((g) => !gear.has(g))) return false;
    if (drill.contraindications?.some((i) => profile.injuries.includes(i))) return false;
    if (drill.positions && profile.position !== "unsure" && !drill.positions.includes(profile.position)) return false;
    return true;
  });
}

function pickDrills(
  profile: AthleteProfile,
  readiness: number,
  category: Category,
  count: number,
  rng: () => number,
  used: Set<string>,
  days: number | null,
): Drill[] {
  const pool = eligible(profile, readiness, category, days);
  const fresh = pool.filter((d) => !used.has(d.id));
  const source = fresh.length >= count ? fresh : [...fresh, ...pool.filter((d) => used.has(d.id))];
  const scored = source
    .map((drill) => {
      let score = rng() * 10;
      if (profile.position !== "unsure" && drill.positions?.includes(profile.position)) score += 4;
      if (profile.goal === "vertical" && drill.category === "plyo") score += 2;
      if (profile.goal === "speed" && drill.category === "agility") score += 2;
      return { drill, score };
    })
    .sort((a, b) => b.score - a.score);
  const picked: Drill[] = [];
  for (const item of scored) {
    if (picked.length >= count) break;
    picked.push(item.drill);
    used.add(item.drill.id);
  }
  return picked;
}

const REST_BY_CATEGORY: Partial<Record<Category, string>> = {
  plyo: "60–90 sec between sets",
  power: "60–90 sec · full reset",
  strength: "75–120 sec",
  agility: "45–75 sec · walk back",
  conditioning: "Equal work : rest",
  skill: "Game pace, quick reset",
  core: "30–45 sec",
};

function loadHint(profile: AthleteProfile, category: Category): string | undefined {
  if (!["strength", "power"].includes(category)) return undefined;
  const byExperience: Record<Experience, string> = {
    beginner: "RPE 6–7 · technique first",
    intermediate: "RPE 7–8 · leave 2 reps",
    advanced: "RPE 8–9 · last set hard",
  };
  return byExperience[profile.experience];
}

function toPrescription(profile: AthleteProfile, drill: Drill): Prescription {
  return {
    name: drill.name,
    dose: drill.dose[profile.experience],
    cue: drill.cue,
    category: drill.category,
    load: loadHint(profile, drill.category),
    rest: REST_BY_CATEGORY[drill.category],
  };
}

function makeBlock(
  profile: AthleteProfile,
  readiness: number,
  category: Category,
  minutes: number,
  exerciseCount: number,
  rng: () => number,
  used: Set<string>,
  days: number | null,
): WorkoutBlock | null {
  const drills = pickDrills(profile, readiness, category, exerciseCount, rng, used, days);
  if (drills.length === 0) return null;
  const meta = BLOCKS[category];
  return {
    id: category,
    title: meta.title,
    type: category === "mobility" || category === "recovery" ? "mixed" : category,
    durationMin: minutes,
    intent: meta.intent,
    exercises: drills.map((drill) => toPrescription(profile, drill)),
  };
}

/* ----------------------------------------------------------------- workouts */

export type BuildInput = {
  profile: AthleteProfile;
  checkin: CheckinInput | null;
  readiness: number;
  date: string;
  days: number | null;
  recentLoad?: number;
};

/**
 * Selects exactly `daysPerWeek` evenly distributed training weekdays, anchored
 * to Monday. Keeping the schedule calendar-based makes it stable across visits
 * and consistent between the dashboard and the plan preview.
 */
export function trainingWeekdays(daysPerWeek: number, blockedWeekdays: number[] = []): number[] {
  const blocked = new Set(blockedWeekdays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6));
  const available = Array.from({ length: 7 }, (_, day) => day).filter((day) => !blocked.has(day));
  const count = Math.min(available.length, Math.max(1, Math.min(7, Math.round(daysPerWeek) || 1)));
  if (!count) return [];
  return Array.from({ length: count }, (_, index) => available[Math.round((index * available.length) / count)]);
}

function mondayFirstWeekday(date: string): number {
  return (new Date(`${date}T12:00:00`).getDay() + 6) % 7;
}

export function basketballCommitmentForDate(
  profile: Pick<AthleteProfile, "recurringBasketballDays">,
  date: string,
): "practice" | "game" | "practice and game" | null {
  const weekday = mondayFirstWeekday(date);
  const practices = profile.recurringBasketballDays?.practiceDays?.includes(weekday) ?? false;
  const games = profile.recurringBasketballDays?.gameDays?.includes(weekday) ?? false;
  if (practices && games) return "practice and game";
  if (games) return "game";
  if (practices) return "practice";
  return null;
}

export function isScheduledTrainingDay(
  profile: Pick<AthleteProfile, "daysPerWeek" | "recurringBasketballDays">,
  date: string,
): boolean {
  const blocked = [
    ...(profile.recurringBasketballDays?.practiceDays ?? []),
    ...(profile.recurringBasketballDays?.gameDays ?? []),
  ];
  return trainingWeekdays(profile.daysPerWeek, blocked).includes(mondayFirstWeekday(date));
}

function buildRestDayPlan(readiness: number, commitment: string | null = null): WorkoutPlan {
  const title = commitment ? `Scheduled ${commitment} day` : "Scheduled rest day";
  const summary = commitment
    ? `Your recurring ${commitment} is scheduled today. It counts as basketball workload, so no extra CourtReady session is added.`
    : "No training session is scheduled today. Prioritize sleep, food, and easy movement if it feels good.";
  return {
    title,
    focus: "recovery",
    phase: commitment ? "Basketball day" : "Recovery day",
    intensity: "restore",
    readinessScore: readiness,
    readinessLabel: readinessLabel(readiness),
    durationMin: 0,
    loadScore: 0,
    summary,
    blocks: [],
    whyThis: [commitment
      ? `Your recurring ${commitment} is reserved as today's basketball work; adding another workout could stack unnecessary load.`
      : "Your weekly training schedule includes a rest day here so you have time to recover between sessions."],
    cautions: [],
    nutrition: {
      proteinG: 0,
      carbsG: 0,
      waterMl: 0,
      recoveryTip: "Keep your normal meals and hydration; there is no need to make up missed training today.",
      gameDayTip: "",
    },
    finisher: commitment ? "Log the activity afterward so the next session can account for its workload." : "Rest is part of the plan.",
    isRestDay: true,
  };
}

export function buildWorkout({ profile, checkin, readiness, date, days, recentLoad = 0 }: BuildInput): WorkoutPlan {
  // A game-day primer remains available even when game day falls on a normal
  // off day. All other dates obey the athlete's selected weekly frequency.
  const commitment = basketballCommitmentForDate(profile, date);
  if (days !== 0 && (commitment || !isScheduledTrainingDay(profile, date))) {
    return buildRestDayPlan(readiness, commitment);
  }

  const phase = calendarPhase(days, date);
  const focus = chooseFocus(profile, phase, readiness, date);
  const rng = mulberry32(hashString(`${profile.id}-${date}-${focus}-${profile.experience}-${profile.position}`));
  const used = new Set<string>();

  const wantedRank = Math.min(INTENSITY_RANK[phase.intensity], INTENSITY_RANK[readinessCap(readiness)]);
  let intensity: Intensity;
  if (days === 0) {
    intensity = "peak";
  } else if (focus === "recovery") {
    intensity = "restore";
  } else {
    intensity = RANK_INTENSITY[Math.max(1, wantedRank)];
  }

  const readinessFactor = 0.72 + (readiness / 100) * 0.32;
  const volume = Math.max(0.42, phase.volume * readinessFactor);
  const durationMin = Math.max(20, Math.round((profile.minutes * Math.min(1, volume + 0.08)) / 5) * 5);

  const warmupMin = Math.min(12, Math.max(6, Math.round(durationMin * 0.18)));
  const cooldownMin = Math.min(10, Math.max(5, Math.round(durationMin * 0.13)));
  const mainMin = Math.max(10, durationMin - warmupMin - cooldownMin);

  const categories =
    focus === "recovery"
      ? (["mobility", "core", "recovery", "skill"] as Category[])
      : [...FOCUS_BLOCKS[focus]];

  // Taper-aware allowlist: no heavy strength, conditioning or high-impact plyo
  // when tip-off is within three days.
  const taperAllow: Category[] | null =
    days === 0
      ? ["skill", "power"]
      : days === 1
        ? ["skill", "power", "core"]
        : days !== null && days > 1 && days <= 3
          ? ["agility", "plyo", "power", "skill", "core"]
          : null;
  const allowed = taperAllow ? categories.filter((category) => taperAllow.includes(category)) : categories;
  const pool = allowed.length > 0 ? allowed : categories.slice(0, 2);
  const trimCount = days === 0 ? 2 : days === 1 ? 2 : intensity === "restore" ? 3 : 4;
  const trimmed = pool.slice(0, trimCount);

  const weightBase = trimmed.map((category, index) => {
    const base: Record<Category, number> = {
      warmup: 1,
      mobility: 1,
      plyo: 1.4,
      power: 1.15,
      strength: 1.35,
      agility: 1.15,
      conditioning: 1.2,
      skill: 1.3,
      core: 0.85,
      recovery: 1.05,
    };
    return base[category] * (index === 0 ? 1.15 : 1);
  });

  const mainBlocks: WorkoutBlock[] = [];
  if (trimmed.length > 0) {
    const minutes = allocate(weightBase, mainMin);
    trimmed.forEach((category, index) => {
      const perExerciseMinutes = 6;
      const count = Math.max(
        1,
        Math.min(3, Math.round((minutes[index] / perExerciseMinutes) * (intensity === "restore" ? 0.8 : 1))),
      );
      const block = makeBlock(profile, readiness, category, minutes[index], count, rng, used, days);
      if (block) mainBlocks.push(block);
    });
  }

  // Always give the athlete something to start and finish with.
  const warmupBlocks: WorkoutBlock[] = [];
  const warm = makeBlock(profile, readiness, "warmup", warmupMin, days === 0 ? 2 : 3, rng, used, days);
  if (warm) warmupBlocks.push(warm);

  const hasRecoveryMain = mainBlocks.some((block) => block.id === "recovery");
  const coolCategory: Category = hasRecoveryMain ? "mobility" : "recovery";
  const cool = makeBlock(profile, readiness, coolCategory, cooldownMin, 2, rng, used, days);

  let blocks = [...warmupBlocks, ...mainBlocks];
  if (cool) blocks.push(cool);

  // Merge repeated block types so the session never shows the same block twice.
  const merged: WorkoutBlock[] = [];
  for (const block of blocks) {
    const existing = merged.find((item) => item.id === block.id);
    if (existing) {
      existing.durationMin += block.durationMin;
      const extra = block.exercises.filter(
        (exercise) => !existing.exercises.some((item) => item.name === exercise.name),
      );
      existing.exercises = [...existing.exercises, ...extra].slice(0, 4);
    } else {
      merged.push({ ...block, exercises: [...block.exercises] });
    }
  }
  blocks = merged;

  // Safety net: never return an empty session.
  if (blocks.length === 0) {
    blocks = [
      {
        id: "fallback",
        title: "General readiness circuit",
        type: "mixed",
        durationMin: durationMin,
        intent: "Keep the streak alive with controlled movement.",
        exercises: [
          {
            name: "Easy movement flow",
            dose: "6 min",
            cue: "Walk, swing the arms, circle the hips. Get blood moving without chasing fatigue.",
            category: "warmup",
          },
          {
            name: "Bodyweight squat + push-up",
            dose: "3 × 8 each",
            cue: "Slow tempo, full range, breathe.",
            category: "strength",
          },
          {
            name: "Box breathing",
            dose: "4 min",
            cue: "In 4, hold 4, out 4, hold 4.",
            category: "recovery",
          },
        ],
      },
    ];
  }

  const loadScore = Math.min(
    100,
    Math.round((durationMin / 60) * 68 * ({ restore: 0.62, maintain: 0.85, build: 1.08, peak: 1.18 } as const)[intensity]),
  );

  const cautions: string[] = [];
  const bmi = bodyMassIndex(profile);
  if (bmi >= 30) cautions.push("Higher body mass: jumping volume is capped and low-impact options are prioritised to protect knees and ankles.");
  if (profile.age < 16) cautions.push("Youth athlete: no maximal loading, focus on landings, coordination and clean technique.");
  if (profile.age >= 40) cautions.push("Masters athlete: plyometric volume is reduced — quality landings and longer rest between sets.");
  if (profile.injuries.length > 0) {
    cautions.push("Injury history is filtered out of today's plan. Any sharp pain = stop the set, not push through it.");
  }
  if ((checkin?.sleepHours ?? 8) < 6.5) cautions.push("Short sleep last night: keep the last rep of every set in the tank and aim for 8 h tonight.");
  if ((checkin?.hydration ?? 5) <= 2) cautions.push("Hydration is low. Drink 500 ml with a pinch of salt before you start.");
  if (readiness < 40) cautions.push("Readiness is low — this is a restore session, not a punishment. Skipping today would also be a valid choice.");
  if (days === 0) cautions.push("Game day: nothing new, nothing heavy. Finish this routine feeling better than you started.");
  if (days !== null && days > 0 && days <= 2) cautions.push("You are inside 48 hours of tip-off — no soreness is the goal. Stop any set that leaves you heavy-legged.");
  if (profile.equipment.length === 0) cautions.push("No equipment selected — every drill chosen is bodyweight/court friendly. Adjust in your profile if that changes.");

  const whyThis: string[] = [];
  whyThis.push(
    `Focus is ${focus === "balanced" ? "all-around development" : FOCUS_TITLES[focus].toLowerCase()} because your goal is ${profile.goal.replace("-", " ")}${profile.position !== "unsure" ? ` and you play ${profile.position}` : ""}.`,
  );
  if (days !== null) {
    whyThis.push(
      days === 0
        ? "It's game day — the session is a pre-game primer only, so your legs are springy at tip-off."
        : days < 0
          ? `You are ${Math.abs(days)} day(s) past a game, so the plan flushes the legs instead of adding load.`
          : `You are ${days} day(s) out from your game (${phase.name}). Volume is set to ${Math.round(volume * 100)}% of a full session to arrive fresh.`,
    );
  } else {
    whyThis.push("No game date set — we're building general capacity with a hard/easy rhythm. Add a game date to unlock tapering.");
  }
  whyThis.push(
    `Readiness scored ${readiness}/100 (${readinessLabel(readiness)}) from your sleep, energy, soreness, stress and hydration, so intensity landed on ${intensity.toUpperCase()}.`,
  );
  if (recentLoad > 0) whyThis.push("Heavy work in the last 48 hours reduced today's jump volume — that's how you stay springy all season.");
  if (profile.injuries.length > 0) whyThis.push("Drills loading your flagged areas were removed automatically; the substitutions train the same qualities safely.");
  if (intensity === "restore") whyThis.push("Low readiness days are where consistency is won: mobility, core and easy skill beats a heroic workout you can't repeat tomorrow.");

  const nutrition = buildNutrition(profile, intensity, days, durationMin);

  const summary =
    days === 0
      ? "Pre-game primer: activation, shooting touch and a calm nervous system. Be the freshest athlete on the floor."
      : `${FOCUS_TITLES[focus]} · ${readinessLabel(readiness)} · ${INTENSITY_LABELS[intensity]} intensity. ${trimmed.length} main blocks in ${durationMin} minutes.`;

  return {
    title:
      days === 0
        ? "Game day primer"
        : focus === "recovery"
          ? "Reset & restore"
          : days === 1
            ? "T-1 activation & touch"
            : FOCUS_TITLES[focus],
    focus,
    phase: phase.name,
    intensity,
    readinessScore: readiness,
    readinessLabel: readinessLabel(readiness),
    durationMin,
    loadScore,
    summary,
    blocks,
    whyThis,
    cautions,
    nutrition,
    finisher:
      days === 0
        ? "Finish with 5 free throws, same routine each time. Then hydrate and eat a carb snack 90 minutes before tip-off."
        : intensity === "restore"
          ? "Finish with 3 minutes of nasal breathing and legs up the wall. Log the session and call it a win."
          : "Finish with 10 game-speed free throws. Makes are the price of entry to the cool-down.",
  };
}

const INTENSITY_LABELS: Record<Intensity, string> = {
  restore: "restore",
  maintain: "maintain",
  build: "build",
  peak: "peak",
};

function buildNutrition(profile: AthleteProfile, intensity: Intensity, days: number | null, durationMin: number): NutritionPlan {
  const protein = Math.round(profile.weightKg * (intensity === "build" || intensity === "peak" ? 2 : 1.8));
  const carbs = Math.round(profile.weightKg * (days === 0 ? 6 : intensity === "restore" ? 3.5 : 4.8));
  const water = Math.round(profile.weightKg * 35 + durationMin * 8);
  return {
    proteinG: protein,
    carbsG: carbs,
    waterMl: Math.round(water / 100) * 100,
    recoveryTip:
      days === 0
        ? "After the game: 30–40 g protein + 1 g/kg carbs within 90 minutes, then 500 ml fluids per 0.5 kg of body mass lost."
        : "Within 90 minutes of the last rep: 30–40 g protein and a fist-sized serving of carbs to start the adaptation.",
    gameDayTip:
      (days ?? 9) <= 1
        ? "Game day: familiar carbs 3 hours out, small easy snack 60–90 min before, 150–250 ml fluid every 15–20 min of warm-up."
        : "Practise your game-day fuelling now: the meal you eat before your next game shouldn't be a first-time experiment.",
  };
}

/* ------------------------------------------------------------------- plans */

export type PreviewDay = PlanDay & { loadScore: number };

export function buildPlanPreview(
  profile: AthleteProfile,
  readiness: number,
  from = todayISO(),
  recentLoad = 0,
): PreviewDay[] {
  const game = daysToGame(profile, from);
  const span = game !== null && game > 0 && game <= 12 ? game : 6;
  const days: PreviewDay[] = [];
  for (let i = 0; i <= span; i += 1) {
    const date = addDays(from, i);
    const remaining = daysToGame(profile, date);
    const plan = buildWorkout({
      profile,
      checkin: null,
      readiness,
      date,
      days: remaining,
      recentLoad,
    });
    days.push({
      date,
      weekday: weekdayShort(date),
      daysToGame: remaining,
      phase: plan.phase,
      focus: plan.focus,
      title: plan.title,
      intensity: plan.intensity,
      durationMin: plan.durationMin,
      loadScore: plan.loadScore,
      isToday: i === 0,
      status: i === 0 ? "today" : "planned",
    });
  }
  return days;
}

export function gameCountdownLabel(days: number | null): string {
  if (days === null) return "No game scheduled";
  if (days === 0) return "Game day — today";
  if (days === 1) return "Tip-off tomorrow";
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} after game`;
  return `${days} days to tip-off`;
}


