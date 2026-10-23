import { eq } from "drizzle-orm";
import { db } from "@/db";
import { checkins } from "@/db/schema";
import {
  filterFeeling,
  generateTodayWorkout,
  getAthleteRow,
  getRecentWorkouts,
  getTodayContext,
} from "@/lib/athlete";
import { addDays, computeReadiness, todayISO } from "@/lib/engine";

export const dynamic = "force-dynamic";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export async function POST(request: Request) {
  const athlete = await getAthleteRow();
  if (!athlete) {
    return Response.json({ error: "No athlete profile in this session" }, { status: 404 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Send a JSON body" }, { status: 400 });
  }

  const asNumber = (key: string, fallback: number) => {
    const value = Number(body[key]);
    return Number.isFinite(value) ? value : fallback;
  };

  const today = todayISO();
  const input = {
    sleepHours: clamp(asNumber("sleepHours", 7.5), 0, 14),
    energy: clamp(Math.round(asNumber("energy", 3)), 1, 5),
    soreness: clamp(Math.round(asNumber("soreness", 2)), 1, 5),
    stress: clamp(Math.round(asNumber("stress", 2)), 1, 5),
    hydration: clamp(Math.round(asNumber("hydration", 3)), 1, 5),
    feeling: filterFeeling(body.feeling),
    soreAreas: Array.isArray(body.soreAreas) ? body.soreAreas.filter((item): item is string => typeof item === "string") : [],
    notes: typeof body.notes === "string" ? body.notes.slice(0, 500) : undefined,
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

  const workout = await generateTodayWorkout(athlete, { force: true });
  const ctx = await getTodayContext();

  return Response.json(
    {
      readiness,
      readinessLabel: workout.plan.readinessLabel,
      daysToGame: ctx?.days ?? null,
      title: workout.plan.title,
      intensity: workout.plan.intensity,
      plan: workout.plan,
    },
    { status: 201 },
  );
}

export async function GET() {
  const athlete = await getAthleteRow();
  if (!athlete) {
    return Response.json({ error: "No athlete profile in this session" }, { status: 404 });
  }
  const rows = await db
    .select()
    .from(checkins)
    .where(eq(checkins.athleteId, athlete.id))
    .limit(30);
  return Response.json({ checkins: rows });
}
