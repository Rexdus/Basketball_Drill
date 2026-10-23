import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, IntensityBadge, LoadChart, SectionHeading, Stat, TrendLine } from "@/components/ui";
import {
  getAthleteRow,
  getRecentCheckins,
  getRecentWorkouts,
  streakFrom,
  toProfile,
} from "@/lib/athlete";
import { addDays, prettyDate, todayISO, weekdayShort } from "@/lib/engine";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const athlete = await getAthleteRow();
  if (!athlete) redirect("/start");
  const profile = toProfile(athlete);
  const [workouts, checkins] = await Promise.all([
    getRecentWorkouts(athlete.id, 30),
    getRecentCheckins(athlete.id, 21),
  ]);

  const completed = workouts.filter((row) => row.status === "completed");
  const skipped = workouts.filter((row) => row.status === "skipped");
  const totalMinutes = completed.reduce((acc, row) => acc + row.durationMin, 0);
  const avgRpe = completed.length
    ? Math.round((completed.reduce((acc, row) => acc + (row.rpe ?? 7), 0) / completed.length) * 10) / 10
    : 0;
  const avgReadiness = checkins.length
    ? Math.round(checkins.reduce((acc, row) => acc + row.readiness, 0) / checkins.length)
    : 0;
  const streak = streakFrom(workouts);
  const today = todayISO();

  const chart = [...workouts]
    .reverse()
    .filter((row) => row.planDate >= addDays(today, -13))
    .map((row) => ({
      label: weekdayShort(row.planDate),
      value: row.loadScore,
      completed: row.status === "completed",
      today: row.planDate === today,
    }));

  const trend = [...checkins].reverse();
  const last21 = Array.from({ length: 21 }, (_, index) => {
    const date = addDays(today, index - 20);
    const row = workouts.find((workout) => workout.planDate === date);
    return { date, row };
  });

  return (
    <main className="mx-auto max-w-6xl px-5 pb-12 pt-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Training log</p>
          <h1 className="display mt-2 text-[clamp(2.1rem,5vw,3.1rem)]">Receipts, not resolutions.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sand">
            Every completed session, readiness score and RPE you log feeds tomorrow&apos;s prescription. Consistency is
            the variable that actually moves your game.
          </p>
        </div>
        <Link href="/" className="btn btn-primary">
          Train today
        </Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Sessions logged" value={completed.length} hint={`${skipped.length} skipped by choice`} accent />
        <Stat label="Minutes trained" value={totalMinutes} hint="Logged across recent sessions" />
        <Stat label="Avg readiness" value={avgReadiness || "—"} hint="Across your last check-ins" />
        <Stat label="Avg RPE" value={avgRpe || "—"} hint={`Streak: ${streak} day${streak === 1 ? "" : "s"}`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.7fr_1fr] lg:items-start">
        <div className="space-y-4">
          <section className="panel p-5">
            <SectionHeading eyebrow="Session history" title="Recent sessions" />
            {workouts.length === 0 ? (
              <div className="mt-4 rounded-xl border border-line bg-ink-2/60 p-5">
                <p className="text-sm text-muted">
                  Nothing logged yet. Generate today&apos;s session and mark it complete to start your log.
                </p>
                <Link href="/" className="btn btn-primary mt-3 !py-2 !text-[0.8rem]">
                  Go to today&apos;s session
                </Link>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-line-soft">
                {workouts.map((row) => (
                  <li key={row.id} className="py-3.5 first:pt-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[0.92rem] font-semibold text-cream">{row.title}</p>
                          {row.status === "completed" ? (
                            <Badge tone="lime">✓ Completed</Badge>
                          ) : row.status === "skipped" ? (
                            <Badge tone="warn">Skipped</Badge>
                          ) : (
                            <Badge tone="outline">Planned</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-[0.74rem] text-muted">
                          {prettyDate(row.planDate)} · {row.phase} · {row.durationMin} min · load {row.loadScore} ·
                          readiness {row.readinessScore}
                        </p>
                        {row.feedback ? (
                          <p className="mt-1 text-[0.76rem] italic leading-snug text-sand">“{row.feedback}”</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {row.rpe ? <Badge tone="outline">RPE {row.rpe}</Badge> : null}
                        <IntensityBadge intensity={row.intensity as "restore" | "maintain" | "build" | "peak"} />
                      </div>
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[0.74rem] font-semibold text-flame-2">
                        Session detail
                      </summary>
                      <div className="mt-2 space-y-1.5">
                        {row.plan.blocks.map((block) => (
                          <div key={block.id} className="rounded-lg border border-line-soft bg-ink-2/60 px-3 py-2">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="text-[0.78rem] font-semibold text-cream">{block.title}</p>
                              <span className="text-[0.66rem] text-muted">{block.durationMin}m</span>
                            </div>
                            <p className="mt-0.5 text-[0.72rem] leading-snug text-muted">
                              {block.exercises.map((exercise) => `${exercise.name} (${exercise.dose})`).join(" · ")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="panel p-5">
            <p className="eyebrow">Load · last 14 days</p>
            <div className="mt-3">
              {chart.length > 0 ? (
                <LoadChart data={chart} />
              ) : (
                <p className="text-[0.8rem] text-muted">Log a session to see your load shape.</p>
              )}
            </div>
            <div className="mt-4 border-t border-line-soft pt-3">
              <p className="eyebrow">Readiness trend</p>
              <div className="mt-2">
                {trend.length > 1 ? (
                  <>
                    <TrendLine
                      points={trend.map((row) => row.readiness)}
                      labels={[trend[0].checkinDate.slice(5), trend[trend.length - 1].checkinDate.slice(5)]}
                    />
                    <p className="mt-1 text-[0.72rem] text-muted">
                      Average {avgReadiness}/100 · {trend.length} check-ins
                    </p>
                  </>
                ) : (
                  <p className="text-[0.78rem] text-muted">Two check-ins unlock the trend.</p>
                )}
              </div>
            </div>
          </section>

          <section className="panel p-5">
            <p className="eyebrow">Consistency · last 3 weeks</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {last21.map((day) => {
                const status = day.row?.status;
                const color =
                  status === "completed"
                    ? "bg-flame"
                    : status === "skipped"
                      ? "bg-amber-500/60"
                      : status === "planned"
                        ? "bg-lime/40"
                        : "bg-[#22261d]";
                return (
                  <div
                    key={day.date}
                    title={`${day.date}: ${status ?? "no session"}`}
                    className={`h-5 w-5 rounded-[4px] ${color}`}
                  />
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-[0.68rem] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-flame" /> Completed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500/60" /> Skipped
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-lime/40" /> Planned
              </span>
            </div>
          </section>

          <section className="panel p-5">
            <p className="eyebrow">Training age</p>
            <div className="mt-2 space-y-2 text-[0.82rem] text-sand">
              <p>
                <span className="font-semibold text-cream">{completed.length}</span> sessions completed by{" "}
                {profile.name.split(" ")[0]}.
              </p>
              <p className="text-muted">
                {completed.length >= 12
                  ? "Enough data that the patterns matter: protect sleep, keep hard days apart, and keep one full rest day."
                  : completed.length >= 4
                    ? "You're building a real training history. Aim for three weeks of this rhythm before judging results."
                    : "The first two weeks are about showing up, not testing your max. Keep the reps clean."}
              </p>
            </div>
            <Link href="/plan" className="mt-3 inline-flex text-[0.78rem] font-semibold text-flame-2">
              See what&apos;s next →
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
