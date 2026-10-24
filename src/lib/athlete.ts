import { cookies } from "next/headers";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { athletes, checkins, workouts, type Athlete, type Checkin, type Workout } from "@/db/schema";
import { buildWorkout, computeReadiness, daysToGame, todayISO } from "@/lib/engine";
import type {
  AthleteProfile,
  CheckinInput,
  Equipment,
  Experience,
  Feeling,
  Goal,
  Injury,
  Position,
  WorkoutPlan,
} from "@/lib/types";

export const ATHLETE_COOKIE = "courtready_athlete";

const POSITIONS: Position[] = ["guard", "wing", "big", "unsure"];
const EXPERIENCES: Experience[] = ["beginner", "intermediate", "advanced"];
const GOALS: Goal[] = ["vertical", "speed", "strength", "conditioning", "skill", "recovery", "balanced"];
const FEELINGS: Feeling[] = ["fresh", "good", "okay", "tired", "wrecked"];
const EQUIPMENT: Equipment[] = [
  "bodyweight",
  "dumbbells",
  "bands",
  "barbell",
  "medicine-ball",
  "box",
  "ball",
  "hoop",
  "court",
];
const INJURIES: Injury[] = ["knee", "ankle", "back", "shoulder", "hamstring"];

export function toProfile(row: Athlete): AthleteProfile {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    heightCm: row.heightCm,
    weightKg: row.weightKg,
    units: "metric",
    position: (POSITIONS.includes(row.position as Position) ? row.position : "unsure") as Position,
    experience: (EXPERIENCES.includes(row.experience as Experience) ? row.experience : "intermediate") as Experience,
    goal: (GOALS.includes(row.goal as Goal) ? row.goal : "balanced") as Goal,
    daysPerWeek: row.daysPerWeek,
    minutes: row.minutes,
    gameDate: row.gameDate,
    equipment: (row.equipment ?? []).filter((e): e is Equipment => EQUIPMENT.includes(e as Equipment)),
    injuries: (row.injuries ?? []).filter((i): i is Injury => INJURIES.includes(i as Injury)),
    notes: row.notes,
  };
}

export function filterFeeling(value: unknown): Feeling {
  return FEELINGS.includes(value as Feeling) ? (value as Feeling) : "good";
}

export async function getAthleteRow(): Promise<Athlete | null> {
  const store = await cookies();
  const token = store.get(ATHLETE_COOKIE)?.value;
  if (!token) return null;
  const rows = await db.select().from(athletes).where(eq(athletes.publicId, token)).limit(1);
  return rows[0] ?? null;
}

export async function getAthleteById(id: number): Promise<Athlete | null> {
  const rows = await db.select().from(athletes).where(eq(athletes.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getCheckin(athleteId: number, date = todayISO()): Promise<Checkin | null> {
  const rows = await db
    .select()
    .from(checkins)
    .where(and(eq(checkins.athleteId, athleteId), eq(checkins.checkinDate, date)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getRecentCheckins(athleteId: number, limit = 14): Promise<Checkin[]> {
  return db
    .select()
    .from(checkins)
    .where(eq(checkins.athleteId, athleteId))
    .orderBy(desc(checkins.checkinDate))
    .limit(limit);
}

export async function getWorkout(athleteId: number, date = todayISO()): Promise<Workout | null> {
  const rows = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.athleteId, athleteId), eq(workouts.planDate, date)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getRecentWorkouts(athleteId: number, limit = 21): Promise<Workout[]> {
  return db
    .select()
    .from(workouts)
    .where(eq(workouts.athleteId, athleteId))
    .orderBy(desc(workouts.planDate))
    .limit(limit);
}

export async function getCompletedCount(athleteId: number): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workouts)
    .where(and(eq(workouts.athleteId, athleteId), eq(workouts.status, "completed")));
  return rows[0]?.count ?? 0;
}

export function checkinToInput(row: Checkin | null): CheckinInput | null {
  if (!row) return null;
  return {
    sleepHours: row.sleepHours,
    energy: row.energy,
    soreness: row.soreness,
    stress: row.stress,
    hydration: row.hydration,
    feeling: filterFeeling(row.feeling),
    soreAreas: row.soreAreas ?? [],
    notes: row.notes ?? undefined,
  };
}

export function recentHardLoad(rows: Workout[]): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 2);
  const cutoffISO = cutoff.toISOString().slice(0, 10);
  return rows
    .filter((row) => row.status === "completed" && row.planDate >= cutoffISO)
    .reduce((acc, row) => acc + row.loadScore / 30, 0);
}

export type TodayContext = {
  athlete: Athlete;
  profile: AthleteProfile;
  checkin: Checkin | null;
  workout: Workout | null;
  readiness: number;
  days: number | null;
};

export async function getTodayContext(): Promise<TodayContext | null> {
  const athlete = await getAthleteRow();
  if (!athlete) return null;
  const profile = toProfile(athlete);
  const today = todayISO();
  const [checkin, existing, recent] = await Promise.all([
    getCheckin(athlete.id, today),
    getWorkout(athlete.id, today),
    getRecentWorkouts(athlete.id, 8),
  ]);
  const input = checkinToInput(checkin);
  const readiness = input ? computeReadiness(input, recentHardLoad(recent)) : 72;
  return {
    athlete,
    profile,
    checkin,
    workout: existing,
    readiness,
    days: daysToGame(profile, today),
  };
}

export async function generateTodayWorkout(
  athlete: Athlete,
  options: { force?: boolean } = {},
): Promise<Workout> {
  const today = todayISO();
  const existing = await getWorkout(athlete.id, today);
  if (existing && !options.force) return existing;

  const profile = toProfile(athlete);
  const [checkinRow, recent] = await Promise.all([
    getCheckin(athlete.id, today),
    getRecentWorkouts(athlete.id, 8),
  ]);
  const input = checkinToInput(checkinRow);
  const readiness = input ? computeReadiness(input, recentHardLoad(recent)) : 72;
  const plan: WorkoutPlan = buildWorkout({
    profile,
    checkin: input,
    readiness,
    date: today,
    days: daysToGame(profile, today),
    recentLoad: recentHardLoad(recent),
  });

  const values = {
    athleteId: athlete.id,
    planDate: today,
    title: plan.title,
    focus: plan.focus,
    phase: plan.phase,
    intensity: plan.intensity,
    durationMin: plan.durationMin,
    loadScore: plan.loadScore,
    readinessScore: plan.readinessScore,
    plan,
  };

  const [saved] = await db
    .insert(workouts)
    .values(values)
    .onConflictDoUpdate({
      target: [workouts.athleteId, workouts.planDate],
      set: {
        title: values.title,
        focus: values.focus,
        phase: values.phase,
        intensity: values.intensity,
        durationMin: values.durationMin,
        loadScore: values.loadScore,
        readinessScore: values.readinessScore,
        plan: values.plan,
      },
    })
    .returning();

  return saved;
}

export async function completedThisWeek(athleteId: number): Promise<Workout[]> {
  const start = new Date();
  start.setDate(start.getDate() - 6);
  const startISO = start.toISOString().slice(0, 10);
  return db
    .select()
    .from(workouts)
    .where(
      and(
        eq(workouts.athleteId, athleteId),
        eq(workouts.status, "completed"),
        gte(workouts.planDate, startISO),
      ),
    )
    .orderBy(desc(workouts.planDate));
}

export function streakFrom(rows: Workout[]): number {
  const completedDates = new Set(rows.filter((r) => r.status === "completed").map((r) => r.planDate));
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 60; i += 1) {
    const iso = toDateISO(cursor);
    if (completedDates.has(iso)) {
      streak += 1;
    } else if (i > 0) {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function toDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}
