"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ProfileForm } from "@/components/ProfileForm";
import { Badge, EmptyState, Stat } from "@/components/ui";
import {
  clearAthlete,
  exportData,
  importData,
  useStore,
} from "@/lib/store";
import { bmiCategory, gameCountdownLabel, prettyDate, todayISO } from "@/lib/engine";
import { GOAL_LABELS, POSITION_LABELS } from "@/lib/types";
import { formatHeight, formatWeight, UNITS_LABELS } from "@/lib/units";

export default function ProfilePage() {
  const { athlete, checkins, workouts } = useStore();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (!athlete) {
    return (
      <main className="mx-auto max-w-6xl px-5 pb-12 pt-8 sm:px-8">
        <EmptyState
          title="No athlete profile yet"
          body="Create your athlete file and CourtReady will start generating sessions for you."
          action={
            <Link href="/start" className="btn btn-primary">
              Build my plan
            </Link>
          }
        />
      </main>
    );
  }

  const days = athlete.gameDate
    ? Math.round(
        (new Date(`${athlete.gameDate}T12:00:00`).getTime() - new Date(`${todayISO()}T12:00:00`).getTime()) /
          86_400_000,
      )
    : null;
  const completed = workouts.filter((row) => row.status === "completed");
  const totalMinutes = completed.reduce((acc, row) => acc + row.durationMin, 0);

  function handleExport() {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `courtready-backup-${todayISO()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage({ ok: true, text: "Backup downloaded. Keep it somewhere safe — it holds your whole training history." });
  }

  function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = importData(String(reader.result ?? ""));
      setMessage({ ok: result.ok, text: result.message });
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function handleReset() {
    if (window.confirm("Reset your athlete? This deletes your profile, check-ins and session history from this browser.")) {
      clearAthlete();
      router.push("/start");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 pb-12 pt-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Athlete file</p>
          <h1 className="display mt-2 text-[clamp(2rem,4.6vw,2.9rem)]">{athlete.name}</h1>
          <p className="mt-2 text-sm text-sand">
            {POSITION_LABELS[athlete.position]} · {athlete.age} yrs ·{" "}
            {formatHeight(athlete.heightCm, athlete.units)} · {formatWeight(athlete.weightKg, athlete.units)} ·{" "}
            {GOAL_LABELS[athlete.goal]}
          </p>
        </div>
        <Link href="/" className="btn btn-ghost">
          ← Back to today&apos;s session
        </Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Next game"
          value={gameCountdownLabel(days)}
          hint={athlete.gameDate ? prettyDate(athlete.gameDate) : "Set a date to unlock tapering"}
          accent
        />
        <Stat label="Sessions logged" value={completed.length} hint="All-time completed sessions" />
        <Stat label="Total minutes" value={totalMinutes} hint="Banked training volume" />
        <Stat label="Body composition" value={bmiCategory(athlete)} hint="Impact caps applied automatically" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.55fr_1fr] lg:items-start">
        <div>
          <ProfileForm profile={athlete} mode="edit" />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="panel p-5">
            <p className="eyebrow">Current setup</p>
            <dl className="mt-3 space-y-2.5 text-[0.82rem]">
              {[
                ["Position", POSITION_LABELS[athlete.position]],
                ["Goal", GOAL_LABELS[athlete.goal]],
                ["Experience", athlete.experience],
                ["Units", UNITS_LABELS[athlete.units ?? "metric"]],
                ["Height", formatHeight(athlete.heightCm, athlete.units)],
                ["Weight", formatWeight(athlete.weightKg, athlete.units)],
                ["Session length", `${athlete.minutes} min`],
                ["Days per week", `${athlete.daysPerWeek}`],
                ["Next game", athlete.gameDate ? prettyDate(athlete.gameDate) : "Not scheduled"],
                ["Check-ins logged", `${checkins.length}`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3 border-b border-line-soft pb-2">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right font-medium text-cream">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {athlete.injuries.length > 0 ? (
                athlete.injuries.map((injury) => (
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
            <p className="eyebrow">Your data</p>
            <p className="mt-2 text-[0.8rem] leading-relaxed text-muted">
              CourtReady is a static app — your data lives only in this browser. Export a backup before switching
              devices or clearing site data, and import it anywhere else.
            </p>
            {message ? (
              <p
                className={`mt-3 rounded-xl border px-3 py-2.5 text-[0.78rem] ${
                  message.ok
                    ? "border-lime/40 bg-lime/10 text-lime"
                    : "border-flame/40 bg-flame/10 text-flame-2"
                }`}
              >
                {message.text}
              </p>
            ) : null}
            <div className="mt-3 flex flex-col gap-2">
              <button type="button" className="btn btn-ghost w-full" onClick={handleExport}>
                Download my data (JSON)
              </button>
              <button
                type="button"
                className="btn btn-ghost w-full"
                onClick={() => fileInput.current?.click()}
              >
                Import a backup
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleImportFile}
              />
            </div>
          </section>

          <section className="panel p-5">
            <p className="eyebrow">Danger zone</p>
            <p className="mt-2 text-[0.8rem] leading-relaxed text-muted">
              Resetting removes your profile, check-ins and session history from this browser. Export a backup first if
              you want to keep them.
            </p>
            <button
              type="button"
              className="btn btn-ghost mt-3 w-full !border-flame/40 !text-flame-2"
              onClick={handleReset}
            >
              Reset athlete &amp; start over
            </button>
            <p className="mt-2 text-center text-[0.68rem] text-muted">
              Profile updated {prettyDate(todayISO())} · data stays in this browser
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
