"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { athletes, checkins, workouts } from "@/db/schema";
import { ATHLETE_COOKIE, filterFeeling, generateTodayWorkout, getAthleteRow, getRecentWorkouts } from "@/lib/athlete";
import { computeReadiness, daysToGame, todayISO, buildWorkout, addDays } from "@/lib/engine";
import type { Equipment, Experience, Goal, Injury, Position } from "@/lib/types";

export type ActionState = { ok: boolean; message: string };

const POSITIONS: Position[] = ["guard", "wing", "big", "unsure"];
const EXPERIENCES: Experience[] = ["beginner", "intermediate", "advanced"];
const GOALS: Goal[] = ["vertical", "speed", "strength", "conditioning", "skill", "recovery", "balanced"];
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

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function number(form: FormData, key: string, fallback: number): number {
  const value = Number(text(form, key));
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function list(form: FormData, key: string): string[] {
  return form
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

function pick<T extends string>(values: string[], allowed: T[], fallback: T): T {
  return values.find((value): value is T => allowed.includes(value as T)) ?? fallback;
}

async function setAthleteCookie(publicId: string) {
  const store = await cookies();
  store.set(ATHLETE_COOKIE, publicId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function saveProfileAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const name = text(form, "name") || "Hooper";
  const age = clamp(Math.round(number(form, "age", 20)), 10, 80);
  const heightCm = clamp(Math.round(number(form, "heightCm", 180)), 120, 230);
  const weightKg = clamp(Math.round(number(form, "weightKg", 75) * 10) / 10, 35, 200);
  const minutes = clamp(Math.round(number(form, "minutes", 55) / 5) * 5, 20, 120);
  const daysPerWeek = clamp(Math.round(number(form, "daysPerWeek", 4)), 1, 7);
  const gameDateRaw = text(form, "gameDate");
  const gameDate = /^\d{4}-\d{2}-\d{2}$/.test(gameDateRaw) ? gameDateRaw : null;

  if (!heightCm || !weightKg) {
    return { ok: false, message: "Add a valid height and weight so we can size your sessions." };
  }

  const payload = {
    name,
    age,
    heightCm,
    weightKg,
    position: pick(list(form, "position"), POSITIONS, "unsure"),
    experience: pick(list(form, "experience"), EXPERIENCES, "intermediate"),
    goal: pick(list(form, "goal"), GOALS, "balanced"),
    daysPerWeek,
    minutes,
    gameDate,
    equipment: list(form, "equipment").filter((e): e is Equipment => EQUIPMENT.includes(e as Equipment)),
    injuries: list(form, "injuries").filter((i): i is Injury => INJURIES.includes(i as Injury)),
    notes: text(form, "notes") || null,
    updatedAt: new Date(),
  };

  const existing = await getAthleteRow();

  if (existing) {
    await db.update(athletes).set(payload).where(eq(athletes.id, existing.id));
    const updated = { ...existing, ...payload };
    await generateTodayWorkout(updated, { force: true });
    revalidatePath("/");
    revalidatePath("/plan");
    revalidatePath("/history");
    revalidatePath("/profile");
    return { ok: true, message: "Profile saved. Today's session has been rebuilt around the new details." };
  }

  const publicId = randomUUID();
  const [created] = await db
    .insert(athletes)
    .values({ ...payload, publicId })
    .returning();
  await setAthleteCookie(publicId);
  await generateTodayWorkout(created, { force: true });
  revalidatePath("/");
  redirect("/");
}

export async function saveCheckinAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const athlete = await getAthleteRow();
  if (!athlete) return { ok: false, message: "Create your athlete profile first." };

  const today = todayISO();
  const input = {
    sleepHours: clamp(number(form, "sleepHours", 7.5), 0, 14),
    energy: clamp(Math.round(number(form, "energy", 3)), 1, 5),
    soreness: clamp(Math.round(number(form, "soreness", 2)), 1, 5),
    stress: clamp(Math.round(number(form, "stress", 2)), 1, 5),
    hydration: clamp(Math.round(number(form, "hydration", 3)), 1, 5),
    feeling: filterFeeling(text(form, "feeling")),
    soreAreas: list(form, "soreAreas"),
    notes: text(form, "notes") || undefined,
  };

  const recent = await getRecentWorkouts(athlete.id, 8);
  const hardLoad = recent
    .filter((row) => row.status === "completed" && row.planDate >= addDays(today, -2))
    .reduce((acc, row) => acc + row.loadScore / 30, 0);
  const readiness = computeReadiness(input, hardLoad);

  await db
    .insert(checkins)
    .values({
      athleteId: athlete.id,
      checkinDate: today,
      sleepHours: input.sleepHours,
      energy: input.energy,
      soreness: input.soreness,
      stress: input.stress,
      hydration: input.hydration,
      feeling: input.feeling,
      soreAreas: input.soreAreas,
      notes: input.notes ?? null,
      readiness,
    })
    .onConflictDoUpdate({
      target: [checkins.athleteId, checkins.checkinDate],
      set: {
        sleepHours: input.sleepHours,
        energy: input.energy,
        soreness: input.soreness,
        stress: input.stress,
        hydration: input.hydration,
        feeling: input.feeling,
        soreAreas: input.soreAreas,
        notes: input.notes ?? null,
        readiness,
      },
    });

  await generateTodayWorkout(athlete, { force: true });
  revalidatePath("/");
  revalidatePath("/plan");
  revalidatePath("/history");
  return { ok: true, message: `Readiness logged at ${readiness}/100. Today's session is ready.` };
}

export async function completeWorkoutAction(form: FormData): Promise<void> {
  const athlete = await getAthleteRow();
  if (!athlete) redirect("/start");
  const workoutId = Math.round(number(form, "workoutId", 0));
  const rpe = clamp(Math.round(number(form, "rpe", 7)), 1, 10);
  const feedback = text(form, "feedback") || null;
  if (!workoutId) return;

  await db
    .update(workouts)
    .set({ status: "completed", rpe, feedback, completedAt: new Date() })
    .where(and(eq(workouts.id, workoutId), eq(workouts.athleteId, athlete.id)));

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/plan");
}

export async function skipWorkoutAction(form: FormData): Promise<void> {
  const athlete = await getAthleteRow();
  if (!athlete) redirect("/start");
  const workoutId = Math.round(number(form, "workoutId", 0));
  if (!workoutId) return;
  await db
    .update(workouts)
    .set({ status: "skipped", feedback: text(form, "feedback") || "Skipped — recovery chosen." })
    .where(and(eq(workouts.id, workoutId), eq(workouts.athleteId, athlete.id)));
  revalidatePath("/");
  revalidatePath("/history");
}

export async function rebuildTodayAction(): Promise<void> {
  const athlete = await getAthleteRow();
  if (!athlete) redirect("/start");
  await generateTodayWorkout(athlete, { force: true });
  revalidatePath("/");
}

export async function demoAthleteAction(): Promise<void> {
  const existing = await getAthleteRow();
  if (existing) {
    await generateTodayWorkout(existing, { force: true });
    redirect("/");
  }

  const publicId = `demo-${randomUUID()}`;
  const today = todayISO();
  const [created] = await db
    .insert(athletes)
    .values({
      publicId,
      name: "Jordan Reyes",
      age: 22,
      heightCm: 188,
      weightKg: 82,
      position: "guard",
      experience: "intermediate",
      goal: "vertical",
      daysPerWeek: 4,
      minutes: 55,
      gameDate: addDays(today, 4),
      equipment: ["bodyweight", "dumbbells", "bands", "medicine-ball", "box", "ball", "hoop", "court"],
      injuries: [],
      notes: "Playing in a rec league Thursday nights. Want to dunk by the end of the season.",
      isDemo: true,
    })
    .returning();

  const history = [
    { offset: -6, sleep: 7.5, energy: 4, soreness: 2, stress: 2, hydration: 4, feeling: "good", status: "completed", rpe: 7, feedback: "Legs felt strong through the jumps." },
    { offset: -5, sleep: 6.5, energy: 3, soreness: 3, stress: 3, hydration: 3, feeling: "okay", status: "completed", rpe: 8, feedback: "Conditioning block was brutal but finished it." },
    { offset: -4, sleep: 8, energy: 5, soreness: 1, stress: 1, hydration: 5, feeling: "fresh", status: "completed", rpe: 6, feedback: "Best shooting session in weeks." },
    { offset: -3, sleep: 5.5, energy: 2, soreness: 4, stress: 4, hydration: 2, feeling: "tired", status: "skipped", rpe: 0, feedback: "Work ran late — chose sleep." },
    { offset: -2, sleep: 7, energy: 4, soreness: 2, stress: 2, hydration: 4, feeling: "good", status: "completed", rpe: 8, feedback: "Strong day. Added extra rim touches." },
    { offset: -1, sleep: 7.5, energy: 4, soreness: 2, stress: 2, hydration: 4, feeling: "good", status: "completed", rpe: 7, feedback: "Short and sharp, perfect before the run." },
  ];

  for (const day of history) {
    const date = addDays(today, day.offset);
    const input = {
      sleepHours: day.sleep,
      energy: day.energy,
      soreness: day.soreness,
      stress: day.stress,
      hydration: day.hydration,
      feeling: filterFeeling(day.feeling),
      soreAreas: [],
    };
    const readiness = computeReadiness(input, day.offset === -2 ? 2 : 0);
    await db.insert(checkins).values({
      athleteId: created.id,
      checkinDate: date,
      sleepHours: day.sleep,
      energy: day.energy,
      soreness: day.soreness,
      stress: day.stress,
      hydration: day.hydration,
      feeling: day.feeling,
      soreAreas: [],
      readiness,
    });
    const plan = buildWorkout({
      profile: {
        id: created.id,
        name: created.name,
        age: created.age,
        heightCm: created.heightCm,
        weightKg: created.weightKg,
        position: "guard",
        experience: "intermediate",
        goal: "vertical",
        daysPerWeek: 4,
        minutes: 55,
        gameDate: created.gameDate,
        equipment: created.equipment as Equipment[],
        injuries: [],
        notes: null,
      },
      checkin: input,
      readiness,
      date,
      days: daysToGame({ gameDate: created.gameDate }, date),
    });
    await db.insert(workouts).values({
      athleteId: created.id,
      planDate: date,
      title: plan.title,
      focus: plan.focus,
      phase: plan.phase,
      intensity: plan.intensity,
      durationMin: plan.durationMin,
      loadScore: plan.loadScore,
      readinessScore: plan.readinessScore,
      plan,
      status: day.status,
      rpe: day.rpe || null,
      feedback: day.feedback,
      completedAt: day.status === "completed" ? new Date(`${date}T18:00:00`) : null,
    });
  }

  await db.insert(checkins).values({
    athleteId: created.id,
    checkinDate: today,
    sleepHours: 7.5,
    energy: 4,
    soreness: 2,
    stress: 2,
    hydration: 4,
    feeling: "good",
    soreAreas: ["Calves"],
    readiness: computeReadiness({
      sleepHours: 7.5,
      energy: 4,
      soreness: 2,
      stress: 2,
      hydration: 4,
      feeling: "good",
      soreAreas: ["Calves"],
    }),
  });

  await generateTodayWorkout(created, { force: true });
  await setAthleteCookie(publicId);
  revalidatePath("/");
  redirect("/");
}

export async function resetAthleteAction(): Promise<void> {
  const athlete = await getAthleteRow();
  if (athlete) {
    await db.delete(athletes).where(eq(athletes.id, athlete.id));
  }
  const store = await cookies();
  store.delete(ATHLETE_COOKIE);
  revalidatePath("/");
  redirect("/start");
}
