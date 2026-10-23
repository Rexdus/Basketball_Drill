import Link from "next/link";
import { redirect } from "next/navigation";
import { resetAthleteAction } from "@/app/actions";
import { ProfileForm } from "@/components/ProfileForm";
import { Badge, Stat } from "@/components/ui";
import { getAthleteRow, getRecentWorkouts, toProfile } from "@/lib/athlete";
import { bmiCategory, gameCountdownLabel, daysToGame, prettyDate, todayISO } from "@/lib/engine";
import { GOAL_LABELS, POSITION_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const athlete = await getAthleteRow();
  if (!athlete) redirect("/start");
  const profile = toProfile(athlete);
  const days = daysToGame(profile);
  const recent = await getRecentWorkouts(athlete.id, 60);
  const completed = recent.filter((row) => row.status === "completed");

  return (
    <main className="mx-auto max-w-6xl px-5 pb-12 pt-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Athlete file</p>
          <h1 className="display mt-2 text-[clamp(2rem,4.6vw,2.9rem)]">{profile.name}</h1>
          <p className="mt-2 text-sm text-sand">
            {POSITION_LABELS[profile.position]} · {profile.age} yrs · {profile.heightCm} cm · {profile.weightKg} kg ·{" "}
            {GOAL_LABELS[profile.goal]}
          </p>
        </div>
        <Link href="/" className="btn btn-ghost">
          ← Back to today&apos;s session
        </Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Next game" value={gameCountdownLabel(days)} hint={profile.gameDate ? prettyDate(profile.gameDate) : "Set a date to unlock tapering"} accent />
        <Stat label="Sessions logged" value={completed.length} hint="All-time completed sessions" />
        <Stat
          label="Total minutes"
          value={completed.reduce((acc, row) => acc + row.durationMin, 0)}
          hint="Banked training volume"
        />
        <Stat label="Body composition" value={bmiCategory(profile)} hint="Impact caps applied automatically" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.55fr_1fr] lg:items-start">
        <div>
          <ProfileForm profile={profile} mode="edit" />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="panel p-5">
            <p className="eyebrow">Current setup</p>
            <dl className="mt-3 space-y-2.5 text-[0.82rem]">
              {[
                ["Position", POSITION_LABELS[profile.position]],
                ["Goal", GOAL_LABELS[profile.goal]],
                ["Experience", profile.experience],
                ["Session length", `${profile.minutes} min`],
                ["Days per week", `${profile.daysPerWeek}`],
                ["Next game", profile.gameDate ? prettyDate(profile.gameDate) : "Not scheduled"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3 border-b border-line-soft pb-2">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right font-medium text-cream">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.injuries.length > 0 ? (
                profile.injuries.map((injury) => (
                  <Badge key={injury} tone="warn">
                    Manage {injury}
                  </Badge>
                ))
              ) : (
                <Badge tone="lime">No injury flags</Badge>
              )}
            </div>
          </section>

          <section className="panel p-5">
            <p className="eyebrow">Account</p>
            <p className="mt-2 text-[0.8rem] leading-relaxed text-muted">
              This athlete is stored against a cookie in your browser. Resetting removes your profile, check-ins and
              session history.
            </p>
            <form action={resetAthleteAction} className="mt-3">
              <button type="submit" className="btn btn-ghost w-full !border-flame/40 !text-flame-2">
                Reset athlete &amp; start over
              </button>
            </form>
            <p className="mt-2 text-center text-[0.68rem] text-muted">
              Profile updated {prettyDate(todayISO())} · data stays local to this app
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
