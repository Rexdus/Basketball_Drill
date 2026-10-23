import { getAthleteRow, getRecentCheckins, getRecentWorkouts, toProfile } from "@/lib/athlete";
import { daysToGame } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const athlete = await getAthleteRow();
  if (!athlete) {
    return Response.json({ error: "No athlete profile in this session" }, { status: 404 });
  }
  const profile = toProfile(athlete);
  const [checkins, workouts] = await Promise.all([
    getRecentCheckins(athlete.id, 7),
    getRecentWorkouts(athlete.id, 7),
  ]);

  return Response.json({
    profile,
    daysToGame: daysToGame(profile),
    checkins: checkins.map((row) => ({ date: row.checkinDate, readiness: row.readiness })),
    workouts: workouts.map((row) => ({
      date: row.planDate,
      title: row.title,
      status: row.status,
      loadScore: row.loadScore,
      durationMin: row.durationMin,
    })),
  });
}
