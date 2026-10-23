import { generateTodayWorkout, getAthleteRow, getTodayContext } from "@/lib/athlete";

export const dynamic = "force-dynamic";

export async function GET() {
  const athlete = await getAthleteRow();
  if (!athlete) {
    return Response.json({ error: "No athlete profile in this session" }, { status: 404 });
  }
  const workout = await generateTodayWorkout(athlete);
  const ctx = await getTodayContext();
  return Response.json({
    readiness: ctx?.readiness ?? workout.readinessScore,
    daysToGame: ctx?.days ?? null,
    workout,
    plan: workout.plan,
  });
}

export async function POST() {
  const athlete = await getAthleteRow();
  if (!athlete) {
    return Response.json({ error: "No athlete profile in this session" }, { status: 404 });
  }
  const workout = await generateTodayWorkout(athlete, { force: true });
  return Response.json({ workout, plan: workout.plan }, { status: 201 });
}
