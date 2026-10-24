"use client";

import Link from "next/link";
import { Badge, EmptyState, IntensityBadge, LoadChart, Stat } from "@/components/ui";
import { useStore, readinessForDate, recentHardLoad } from "@/lib/store";
import {
  addDays,
  buildWorkout,
  gameCountdownLabel,
  prettyDate,
  todayISO,
  weekdayShort,
} from "@/lib/engine";
import { GOAL_LABELS } from "@/lib/types";

export default function PlanPage() {
  const { athlete, checkins, workouts, activities } = useStore();

  if (!athlete) {
    return (
      <main className="mx-auto max-w-6xl px-5 pb-12 pt-8 sm:px-8">
        <EmptyState
          title="No athlete profile yet"
          body="Create your athlete file and CourtReady will periodize your week around your next game."
          action={
            <Link href="/start" className="btn btn-primary">
              Build my plan
            </Link>
          }
        />
      </main>
    );
  }

  const today = todayISO();
  const readiness = readinessForDate(checkins, today, workouts, activities);
  const recentLoad = recentHardLoad(workouts, activities);
  const gameDays = athlete.gameDate
    ? Math.round(
        (new Date(`${athlete.gameDate}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) /
          86_400_000,
      )
    : null;
  const span = gameDays !== null && gameDays > 0 && gameDays <= 12 ? gameDays : 6;

  const days = Array.from({ length: span + 1 }, (_, index) => {
    const date = addDays(today, index);
    const remaining = athlete.gameDate
      ? Math.round(
          (new Date(`${athlete.gameDate}T12:00:00`).getTime() - new Date(`${date}T12:00:00`).getTime()) /
            86_400_000,
        )
      : null;
    const plan = buildWorkout({ profile: athlete, checkin: null, readiness, date, days: remaining, recentLoad });
    return { date, remaining, plan };
  });

  const totalMinutes = days.reduce((acc, day) => acc + day.plan.durationMin, 0);
  const plannedSessions = days.filter((day) => !day.plan.isRestDay && day.remaining !== 0).length;
  const hardDays = days.filter(
    (day) => !day.plan.isRestDay && (day.plan.intensity === "build" || day.plan.intensity === "peak"),
  ).length;
  const gameDay = gameDays !== null && gameDays >= 0 && gameDays <= span;

  return (
    <main className="mx-auto max-w-6xl px-5 pb-12 pt-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Game plan · periodized backwards from tip-off</p>
          <h1 className="display mt-2 text-[clamp(2.1rem,5vw,3.1rem)]">
            {gameCountdownLabel(gameDays)}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sand">
            {athlete.gameDate
              ? `Game: ${prettyDate(athlete.gameDate)}. Sessions, recurring practices, and games are mapped from your weekly setup; training volume shifts as tip-off gets closer.`
              : "You haven't set a game date yet, so this is a rolling week. Recurring basketball days are protected from extra workouts; add your next tip-off to unlock the full taper."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/profile" className="btn btn-ghost">
            {athlete.gameDate ? "Change game date" : "Add a game date"}
          </Link>
          <Link href="/" className="btn btn-primary">
            Today&apos;s session
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Window" value={`${days.length} days`} hint={`${athlete.daysPerWeek} training days per week`} />
        <Stat label="Planned sessions" value={plannedSessions} hint={`${totalMinutes} training minutes in this runway`} accent />
        <Stat label="Key sessions" value={hardDays} hint="Build or peak days in this runway" />
        <Stat label="Primary goal" value={GOAL_LABELS[athlete.goal]} hint="Each day skews toward this" />
      </div>

      {!athlete.gameDate ? (
        <div className="panel mt-4 flex flex-wrap items-center justify-between gap-3 border-flame/30 bg-flame/[0.06] p-4">
          <p className="text-[0.84rem] text-sand">
            <span className="font-semibold text-cream">Unlock the taper.</span> Set your next game date and
            CourtReady will build the week backwards: develop → build → sharpen → taper → game day primer.
          </p>
          <Link href="/profile" className="btn btn-primary !py-2 !text-[0.78rem]">
            Set game date
          </Link>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.7fr_1fr] lg:items-start">
        <section className="panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft px-5 py-4">
            <div>
              <p className="eyebrow">Day by day</p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-cream">Your runway</h2>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="outline">Develop</Badge>
              <Badge tone="flame">Build</Badge>
              <Badge tone="lime">Sharpen</Badge>
              <Badge tone="warn">Game</Badge>
            </div>
          </div>

          <ol className="divide-y divide-line-soft">
            {days.map((day, index) => {
              const isGame = day.remaining === 0;
              return (
                <li key={day.date} className="relative px-5 py-4 sm:px-6">
                  <div className="flex gap-4">
                    <div className="w-12 shrink-0 text-center">
                      <p className={`text-[0.64rem] uppercase tracking-[0.14em] ${index === 0 ? "text-flame-2" : "text-muted"}`}>
                        {weekdayShort(day.date)}
                      </p>
                      <p className="text-lg font-bold leading-tight text-cream">
                        {new Date(`${day.date}T12:00:00`).getDate()}
                      </p>
                      <p className="text-[0.6rem] text-muted">
                        {isGame
                          ? "Game"
                        : day.remaining === null
                          ? "Week"
                          : day.remaining < 0
                            ? `+${Math.abs(day.remaining)}`
                            : `T-${day.remaining}`}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[0.95rem] font-bold text-cream">{day.plan.title}</p>
                        {index === 0 ? <Badge tone="flame">Today</Badge> : null}
                        {isGame ? <Badge tone="warn">Game day</Badge> : null}
                        {day.plan.isRestDay
                          ? <Badge tone="outline">{day.plan.phase === "Basketball day" ? "Basketball day" : "Off day"}</Badge>
                          : <IntensityBadge intensity={day.plan.intensity} />}
                      </div>
                      <p className="mt-1 text-[0.78rem] text-muted">
                        {day.plan.isRestDay
                          ? "Recovery · no training session scheduled"
                          : `${day.plan.phase} · ${day.plan.durationMin} min · load ${day.plan.loadScore}/100 · ${day.plan.blocks.length} blocks`}
                      </p>
                      {day.plan.isRestDay ? (
                        <p className="mt-2 text-[0.76rem] leading-snug text-sand">{day.plan.summary}</p>
                      ) : (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-[0.75rem] font-semibold text-flame-2">
                            View {day.plan.blocks.length} blocks
                          </summary>
                          <div className="mt-2 space-y-1.5">
                            {day.plan.blocks.map((block) => (
                              <div key={block.id} className="rounded-lg border border-line-soft bg-ink-2/60 px-3 py-2">
                                <div className="flex items-baseline justify-between gap-2">
                                  <p className="text-[0.78rem] font-semibold text-cream">{block.title}</p>
                                  <span className="text-[0.66rem] text-muted">{block.durationMin}m</span>
                                </div>
                                <p className="mt-0.5 text-[0.72rem] leading-snug text-muted">
                                  {block.exercises.map((exercise) => exercise.name).join(" · ")}
                                </p>
                              </div>
                            ))}
                            {index === 0 ? (
                              <Link href="/" className="mt-1 inline-flex text-[0.74rem] font-semibold text-lime">
                                Open today&apos;s full session →
                              </Link>
                            ) : null}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="space-y-4">
          <section className="panel p-5">
            <p className="eyebrow">Load shape</p>
            <p className="mt-1 text-[0.8rem] leading-relaxed text-muted">
              Bars show planned CourtReady workout load. Log the duration and effort of practices, games, and bike workouts in My log to account for their workload.
            </p>
            <div className="mt-4">
              <LoadChart
                data={days.map((day) => ({
                  label:
                    day.remaining === null
                      ? weekdayShort(day.date).slice(0, 1)
                      : day.remaining === 0
                        ? "G"
                        : day.remaining > 0
                          ? `T${day.remaining}`
                          : `+${Math.abs(day.remaining)}`,
                  value: day.plan.loadScore,
                  completed: day.remaining !== null && day.remaining < 0,
                  today: day.date === today,
                }))}
              />
            </div>
          </section>

          <section className="panel p-5">
            <p className="eyebrow">Peak week rules</p>
            <ul className="mt-3 space-y-2.5 text-[0.82rem] leading-snug text-sand">
              <li>
                <span className="font-semibold text-cream">T-7 to T-4:</span> last real strength and jump stimulus.
                This is where the adaptation happens.
              </li>
              <li>
                <span className="font-semibold text-cream">T-3 to T-2:</span> sharpen only. Short, fast, sub-maximal.
                Skill volume stays high.
              </li>
              <li>
                <span className="font-semibold text-cream">T-1:</span> activation and touch. Nothing that leaves you
                sore. Finish feeling springy.
              </li>
              <li>
                <span className="font-semibold text-cream">Game day:</span> pre-game primer only. Your game is the
                session.
              </li>
            </ul>
          </section>

          <section className="panel p-5">
            <p className="eyebrow">Game-day fuel timeline</p>
            <ol className="mt-3 space-y-2.5">
              {[
                ["3 h before", "Familiar carbs + moderate protein. Nothing new, nothing heavy or greasy."],
                ["90 min before", "Small easy carb snack (banana, rice cakes) and 400–600 ml fluid."],
                ["Warm-up", "Sip 150–250 ml every 15–20 min. Add electrolytes if you sweat heavily."],
                ["Halftime", "Small carb hit if the game is long — half a banana or a few chews."],
                ["After", "30–40 g protein + carbs within 90 min, plus 1.5× the fluid you lost."],
              ].map(([time, detail]) => (
                <li key={time} className="border-l border-line pl-3">
                  <p className="text-[0.78rem] font-semibold text-cream">{time}</p>
                  <p className="text-[0.74rem] leading-snug text-muted">{detail}</p>
                </li>
              ))}
            </ol>
          </section>

          {gameDay ? (
            <section className="panel border-flame/30 bg-flame/[0.06] p-5">
              <p className="eyebrow text-flame-2">Peak target</p>
              <p className="mt-2 text-[0.86rem] leading-relaxed text-sand">
                {prettyDate(athlete.gameDate ?? today)} is your performance target. By then, jump volume has been
                cut for {Math.min(2, span)} days, skill touch is high, and the last heavy session is at least 72
                hours in the past.
              </p>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
