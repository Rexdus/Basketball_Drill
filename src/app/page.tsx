"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CheckinForm } from "@/components/CheckinForm";
import { Landing } from "@/components/Landing";
import { WorkoutView } from "@/components/WorkoutView";
import {
  Badge,
  IntensityBadge,
  LoadChart,
  ReadinessRing,
  Stat,
  TrendLine,
} from "@/components/ui";
import {
  ensureTodayWorkout,
  readinessForDate,
  regenerateToday,
  recentHardLoad,
  streakOf,
  useStore,
  type StoredCheckin,
} from "@/lib/store";
import {
  bmiCategory,
  buildPlanPreview,
  gameCountdownLabel,
  prettyDate,
  todayISO,
  weekdayShort,
} from "@/lib/engine";
import { EQUIPMENT_LABELS, GOAL_LABELS, POSITION_LABELS, type CheckinInput } from "@/lib/types";
import { formatHeight, formatWeight } from "@/lib/units";

function checkinToInput(checkin: StoredCheckin | null): CheckinInput | null {
  if (!checkin) return null;
  return {
    sleepHours: checkin.sleepHours,
    energy: checkin.energy,
    soreness: checkin.soreness,
    stress: checkin.stress,
    hydration: checkin.hydration,
    feeling: checkin.feeling,
    soreAreas: checkin.soreAreas ?? [],
    notes: checkin.notes,
  };
}

export default function HomePage() {
  const { athlete, checkins, workouts, activities } = useStore();
  const today = todayISO();

  // Make sure a session exists for today (generated from profile + check-in).
  useEffect(() => {
    if (athlete) ensureTodayWorkout(athlete);
  }, [athlete]);

  // No athlete in this browser → the marketing landing page. This also renders
  // during prerender, so the static export ships real content without JS.
  if (!athlete) return <Landing />;

  const todayCheckin = checkins.find((row) => row.date === today) ?? null;
  const readiness = readinessForDate(checkins, today, workouts, activities);
  const days = athlete.gameDate
    ? Math.round(
        (new Date(`${athlete.gameDate}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) /
          86_400_000,
      )
    : null;
  const todayWorkout = workouts.find((row) => row.date === today) ?? null;

  const recentWorkouts = [...workouts].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 14);
  const weekWorkouts = workouts.filter((row) => {
    if (row.status !== "completed") return false;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    const cutoffISO = `${cutoff.getFullYear()}-${`${cutoff.getMonth() + 1}`.padStart(2, "0")}-${`${cutoff.getDate()}`.padStart(2, "0")}`;
    return row.date >= cutoffISO;
  });

  const plan = buildPlanPreview(athlete, readiness, today, recentHardLoad(workouts, activities));
  const upcoming = plan.slice(0, Math.min(5, plan.length));
  const streak = streakOf(workouts);
  const weekMinutes = weekWorkouts.reduce((acc, row) => acc + row.durationMin, 0);
  const latestCheckinInput = checkinToInput(todayCheckin);

  const chart = [...recentWorkouts]
    .reverse()
    .slice(-10)
    .map((row) => ({
      label: weekdayShort(row.date),
      value: row.loadScore,
      completed: row.status === "completed",
      today: row.date === today,
    }));

  const readinessTrend = [...checkins]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((row) => row.readiness);

  const loggedWorkouts = recentWorkouts.filter((row) => row.status !== "planned");

  const coachNote =
    days === 0
      ? "It's game day. Keep this short, keep it sharp, and finish feeling better than you started."
      : todayWorkout?.plan.phase === "Basketball day"
        ? "You have a recurring basketball commitment today. Let that be today's court work, then log it so future sessions can adjust."
        : todayWorkout?.plan.isRestDay
          ? `Today is a scheduled off day in your ${athlete.daysPerWeek}-day training week. Prioritize recovery; easy movement is optional.`
        : weekWorkouts.length >= athlete.daysPerWeek
        ? `${weekWorkouts.length} sessions logged this week — that's your target hit. Protect sleep and let the adaptation happen.`
        : weekWorkouts.length === 0
          ? `No sessions logged this week yet. One focused ${athlete.minutes}-minute session today resets the whole week.`
          : `${weekWorkouts.length} of ${athlete.daysPerWeek} sessions logged this week. ${
              readiness >= 70
                ? "You're recovered enough to push the main block hard today."
                : "Keep today controlled and bank the consistency instead of chasing fatigue."
            }`;

  return (
    <main className="mx-auto max-w-6xl px-5 pb-10 pt-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            {prettyDate(today)} · {gameCountdownLabel(days)}
          </p>
          <h1 className="display mt-2 text-[clamp(2.1rem,5vw,3.1rem)]">
            {athlete.name.split(" ")[0]}, let&apos;s get you ready.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sand">
            {days === 0
              ? "Game day protocol is live. Short activation, shooting touch, done."
              : days !== null && days > 0
                ? `${days} day${days === 1 ? "" : "s"} to tip-off. Your week is periodized so the legs arrive fresh.`
                : "No game scheduled yet — add a date in your profile to unlock the full game-day taper."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="outline">{GOAL_LABELS[athlete.goal]}</Badge>
          <Badge tone="outline">{POSITION_LABELS[athlete.position]}</Badge>
          <button
            type="button"
            className="btn btn-ghost !py-2 !text-[0.78rem]"
            onClick={() => regenerateToday(athlete)}
          >
            Rebuild session
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel flex items-center gap-3 p-4">
          <ReadinessRing score={readiness} size={78} />
          <div>
            <p className="eyebrow">Readiness</p>
            <p className="mt-1 text-sm font-semibold text-cream">
              {todayCheckin ? "Check-in logged" : "Baseline estimate"}
            </p>
            <p className="mt-0.5 text-[0.7rem] leading-snug text-muted">
              {todayCheckin ? "Recalculated from today's signals" : "Log a check-in for a real score"}
            </p>
          </div>
        </div>
        <Stat
          label="Game countdown"
          value={days === null ? "—" : days === 0 ? "Today" : days > 0 ? `${days}d` : `+${Math.abs(days)}d`}
          hint={days === null ? "Add your next game date" : days > 0 ? "Tapered, focused, fresh" : "Post-game flush mode"}
          accent
        />
        <Stat
          label="This week"
          value={`${weekWorkouts.length}/${athlete.daysPerWeek}`}
          hint={`${weekMinutes} min trained in the last 7 days`}
        />
        <Stat label="Current streak" value={`${streak}d`} hint={streak > 0 ? "Keep the chain alive" : "Log today to start"} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.75fr_1fr]">
        <div className="space-y-5">
          <section className="panel p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="eyebrow">Morning check-in</p>
                <h2 className="mt-1.5 text-xl font-bold tracking-tight">
                  {todayCheckin ? "Today's signals" : "How are you feeling today?"}
                </h2>
              </div>
              {todayCheckin ? <Badge tone="lime">Scored {readiness}/100</Badge> : <Badge tone="flame">2 min</Badge>}
            </div>

            {todayCheckin ? (
              <div className="mt-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {[
                    { label: "Sleep", value: `${todayCheckin.sleepHours} h` },
                    { label: "Energy", value: `${todayCheckin.energy}/5` },
                    { label: "Soreness", value: `${todayCheckin.soreness}/5` },
                    { label: "Stress", value: `${todayCheckin.stress}/5` },
                    { label: "Water", value: `${todayCheckin.hydration}/5` },
                  ].map((signal) => (
                    <div key={signal.label} className="panel-flat px-3 py-2.5">
                      <p className="text-[0.62rem] uppercase tracking-[0.14em] text-muted">{signal.label}</p>
                      <p className="mt-0.5 text-sm font-semibold text-cream">{signal.value}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[0.8rem] text-muted">
                  Feeling: <span className="text-sand">{todayCheckin.feeling}</span>
                  {todayCheckin.soreAreas.length > 0
                    ? ` · Sore: ${todayCheckin.soreAreas.join(", ")}`
                    : " · No sore spots flagged"}
                </p>
                <details className="mt-3">
                  <summary className="cursor-pointer text-[0.78rem] font-semibold text-flame-2">
                    Update check-in &amp; rebuild session
                  </summary>
                  <div className="mt-4">
                    <CheckinForm existing={latestCheckinInput} />
                  </div>
                </details>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-[0.85rem] leading-relaxed text-muted">
                  Five honest signals decide today&apos;s intensity, jump volume and conditioning dose. It takes about two
                  minutes and completely changes the prescription.
                </p>
                <div className="mt-4">
                  <CheckinForm existing={latestCheckinInput} />
                </div>
              </div>
            )}
          </section>

          {todayWorkout ? (
            <WorkoutView
              plan={todayWorkout.plan}
              workout={todayWorkout}
              bodyWeightKg={athlete.weightKg}
              units={athlete.units}
            />
          ) : (
            <section className="panel p-6">
              <h2 className="text-lg font-semibold">No session yet</h2>
              <p className="mt-1 text-sm text-muted">Rebuild to generate today&apos;s prescription.</p>
              <button
                type="button"
                className="btn btn-primary mt-3"
                onClick={() => ensureTodayWorkout(athlete)}
              >
                Build today&apos;s session
              </button>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <section className="panel relative overflow-hidden p-5">
            <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-flame/20 blur-2xl" />
            <p className="eyebrow">Game-day runway</p>
            <p className="display mt-2 text-5xl text-cream">
              {days === null ? "—" : days > 0 ? days : days === 0 ? "0" : `+${Math.abs(days)}`}
              {days !== null && days > 0 ? <span className="ml-1 text-lg text-muted">days</span> : null}
            </p>
            <p className="mt-1 text-[0.8rem] text-sand">{gameCountdownLabel(days)}</p>
            <div className="mt-4 space-y-1.5">
              {upcoming.map((day) => (
                <div
                  key={day.date}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 ${
                    day.isToday ? "border-flame/40 bg-flame/10" : "border-line-soft bg-ink-2/60"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`w-8 text-[0.68rem] uppercase ${day.isToday ? "text-flame-2" : "text-muted"}`}>
                      {day.weekday}
                    </span>
                    <span className="truncate text-[0.76rem] text-sand">{day.title}</span>
                  </div>
                  <span className="shrink-0 text-[0.66rem] text-muted">{day.durationMin}m</span>
                </div>
              ))}
            </div>
            <Link
              href="/plan"
              className="mt-3 inline-flex text-[0.78rem] font-semibold text-flame-2 hover:text-flame"
            >
              Open the full game plan →
            </Link>
          </section>

          <section className="panel p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Training load</p>
                <p className="mt-1 text-[0.8rem] text-muted">Last {chart.length || 0} planned days</p>
              </div>
              <Badge tone="outline">{chart.filter((c) => c.completed).length} logged</Badge>
            </div>
            <div className="mt-4">
              {chart.length > 0 ? (
                <LoadChart data={chart} />
              ) : (
                <p className="text-[0.78rem] text-muted">Your load chart appears after your first session.</p>
              )}
            </div>
            <div className="mt-4 border-t border-line-soft pt-3">
              <p className="eyebrow">Readiness trend</p>
              <div className="mt-2">
                {readinessTrend.length > 1 ? (
                  <TrendLine points={readinessTrend} />
                ) : (
                  <p className="text-[0.78rem] text-muted">Two check-ins unlock your trend line.</p>
                )}
              </div>
            </div>
          </section>

          <section className="panel p-5">
            <p className="eyebrow">Coach note</p>
            <p className="mt-2 text-[0.84rem] leading-relaxed text-sand">{coachNote}</p>
            <div className="hairline my-4" />
            <div className="flex flex-wrap gap-2">
              <Badge tone="outline">{formatHeight(athlete.heightCm, athlete.units)}</Badge>
              <Badge tone="outline">{formatWeight(athlete.weightKg, athlete.units)}</Badge>
              <Badge tone="outline">{bmiCategory(athlete)}</Badge>
              <Badge tone="outline">{athlete.minutes} min sessions</Badge>
            </div>
            <p className="mt-3 text-[0.72rem] leading-snug text-muted">
              Gear:{" "}
              {athlete.equipment.length
                ? athlete.equipment.map((e) => EQUIPMENT_LABELS[e]).join(", ")
                : "Bodyweight only"}
              {athlete.injuries.length ? ` · Managing: ${athlete.injuries.join(", ")}` : ""}
            </p>
            <Link href="/profile" className="mt-3 inline-flex text-[0.78rem] font-semibold text-flame-2">
              Edit athlete profile →
            </Link>
          </section>

          <section className="panel p-5">
            <p className="eyebrow">Recent log</p>
            <div className="mt-3 space-y-2">
              {loggedWorkouts.slice(0, 4).map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[0.8rem] text-cream">{row.title}</p>
                    <p className="text-[0.68rem] text-muted">
                      {weekdayShort(row.date)} · {row.durationMin} min
                      {row.rpe ? ` · RPE ${row.rpe}` : ""}
                    </p>
                  </div>
                  {row.status === "completed" ? (
                    <IntensityBadge intensity={row.intensity === "peak" ? "peak" : "maintain"} />
                  ) : (
                    <Badge tone="outline">Skipped</Badge>
                  )}
                </div>
              ))}
              {loggedWorkouts.length === 0 ? (
                <p className="text-[0.78rem] text-muted">Nothing logged yet — today can be day one.</p>
              ) : null}
            </div>
          </section>
        </aside>
      </div>

      <p className="mt-8 text-center text-[0.72rem] text-muted">
        Session adapted to {athlete.name} · {POSITION_LABELS[athlete.position]} · {athlete.experience} ·{" "}
        {GOAL_LABELS[athlete.goal]}
      </p>
    </main>
  );
}
