import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, IntensityBadge, LoadChart, SectionHeading, Stat } from "@/components/ui";
import { getAthleteRow, getTodayContext, toProfile } from "@/lib/athlete";
import {
  addDays,
  buildWorkout,
  daysToGame,
  gameCountdownLabel,
  prettyDate,
  todayISO,
  weekdayShort,
} from "@/lib/engine";
import { GOAL_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const athlete = await getAthleteRow();
  if (!athlete) redirect("/start");
  const ctx = await getTodayContext();
  const profile = toProfile(athlete);
  const readiness = ctx?.readiness ?? 72;
  const today = todayISO();
  const gameDays = daysToGame(profile);
  const span = gameDays !== null && gameDays > 0 && gameDays <= 12 ? gameDays : 6;

  const days = Array.from({ length: span + 1 }, (_, index) => {
    const date = addDays(today, index);
    const remaining = daysToGame(profile, date);
    const plan = buildWorkout({ profile, checkin: null, readiness, date, days: remaining });
    return { date, remaining, plan };
  });

  const totalMinutes = days.reduce((acc, day) => acc + day.plan.durationMin, 0);
  const hardDays = days.filter((day) => day.plan.intensity === "build" || day.plan.intensity === "peak").length;
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
            {profile.gameDate
              ? `Game: ${prettyDate(profile.gameDate)}. Each session below is built from the same profile and readiness baseline (${readiness}/100), with volume shifting as the game gets closer.`
              : "You haven't set a game date yet, so this is a rolling development week. Add your next tip-off in your profile to unlock the full taper."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/profile" className="btn btn-ghost">
            {profile.gameDate ? "Change game date" : "Add a game date"}
          </Link>
          <Link href="/" className="btn btn-primary">
            Today&apos;s session
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Window" value={`${days.length} days`} hint="Every day mapped to a purpose" />
        <Stat label="Planned minutes" value={totalMinutes} hint="Across the full runway" accent />
        <Stat label="Key sessions" value={hardDays} hint="Build or peak days — never back to back" />
        <Stat label="Primary goal" value={GOAL_LABELS[profile.goal]} hint="Each day skews toward this" />
      </div>

      {!profile.gameDate ? (
        <div className="panel mt-4 flex flex-wrap items-center justify-between gap-3 border-flame/30 bg-flame/[0.06] p-4">
          <p className="text-[0.84rem] text-sand">
            <span className="font-semibold text-cream">Unlock the taper.</span> Set your next game date and CourtReady
            will build the week backwards: develop → build → sharpen → taper → game day primer.
          </p>
          <Link href="/profile" className="btn btn-primary !py-2 !text-[0.78rem]">
            Set game date
          </Link>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.7fr_1fr] lg:items-start">
        <section className="panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft px-5 py-4">
            <SectionHeading eyebrow="Day by day" title="Your runway" />
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
                        {isGame ? "Game" : day.remaining !== null && day.remaining < 0 ? `+${Math.abs(day.remaining)}` : `T-${day.remaining}`}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[0.95rem] font-bold text-cream">{day.plan.title}</p>
                        {index === 0 ? <Badge tone="flame">Today</Badge> : null}
                        {isGame ? <Badge tone="warn">Game day</Badge> : null}
                        <IntensityBadge intensity={day.plan.intensity} />
                      </div>
                      <p className="mt-1 text-[0.78rem] text-muted">
                        {day.plan.phase} · {day.plan.durationMin} min · load {day.plan.loadScore}/100 · {day.plan.blocks.length} blocks
                      </p>
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
                            <Link
                              href="/"
                              className="mt-1 inline-flex text-[0.74rem] font-semibold text-lime"
                            >
                              Open today&apos;s full session →
                            </Link>
                          ) : null}
                        </div>
                      </details>
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
            <p className="mt-1 text-[0.8rem] text-muted">
              Hard days are separated so you adapt between sessions and arrive fresh.
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
                <span className="font-semibold text-cream">T-7 to T-4:</span> last real strength and jump stimulus. This
                is where the adaptation happens.
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
                {prettyDate(profile.gameDate ?? today)} is your performance target. By then, jump volume has been cut
                for {Math.min(2, span)} days, skill touch is high, and the last heavy session is at least 72 hours in
                the past.
              </p>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
