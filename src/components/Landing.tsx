"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildWorkout, todayISO } from "@/lib/engine";
import { DRILLS } from "@/lib/exercises";
import { createDemoAthlete } from "@/lib/store";
import type { AthleteProfile } from "@/lib/types";
import { Badge, SectionHeading } from "./ui";

const SAMPLE_PROFILE: AthleteProfile = {
  id: 1,
  name: "Sample guard",
  age: 22,
  heightCm: 188,
  weightKg: 82,
  position: "guard",
  experience: "intermediate",
  goal: "vertical",
  daysPerWeek: 4,
  minutes: 55,
  gameDate: null,
  equipment: ["bodyweight", "dumbbells", "bands", "medicine-ball", "box", "ball", "hoop", "court"],
  injuries: [],
  notes: null,
};

const SIGNALS = [
  { label: "Sleep", detail: "Hours banked last night drive how much volume you can absorb." },
  { label: "Energy", detail: "Your honest pop level decides intensity, not your ego." },
  { label: "Soreness", detail: "Tight areas get flagged and high-impact drills get swapped." },
  { label: "Stress", detail: "Life load changes recovery — we account for it." },
  { label: "Hydration", detail: "Low hydration downgrades conditioning and power output." },
];

const PILLARS = [
  {
    kicker: "Rules engine",
    title: "Every rep has a reason",
    body: "Age, height, weight, position, experience, equipment and injuries filter the drill pool before anything is prescribed. Nothing generic survives.",
  },
  {
    kicker: "Game-day taper",
    title: "Built backwards from tip-off",
    body: "Set your next game and CourtReady shifts from develop → build → sharpen → taper, so your best legs show up on the night.",
  },
  {
    kicker: "Readiness aware",
    title: "Training that reads the room",
    body: "Wrecked after work? The session becomes restore work instead of a heroic plyo day you'll regret tomorrow.",
  },
  {
    kicker: "Basketball first",
    title: "Jumps, cuts, touch, engine",
    body: "Plyometrics and landings, first-step speed, contact strength, late-game conditioning and real skill work under fatigue.",
  },
];

export function Landing() {
  const router = useRouter();
  const sample = buildWorkout({
    profile: SAMPLE_PROFILE,
    checkin: null,
    readiness: 78,
    date: todayISO(),
    days: 4,
  });

  return (
    <main>
      <section className="relative isolate overflow-hidden border-b border-line-soft">
        <div className="absolute inset-0 -z-20">
          <Image
            src="/images/hero-court.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[62%_center] opacity-60"
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/90 to-ink/35" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-transparent to-ink/60" />

        <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="animate-rise">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="flame">Basketball performance OS</Badge>
              <span className="text-[0.7rem] uppercase tracking-[0.16em] text-muted">
                {DRILLS.length} drills · rules-based engine
              </span>
            </div>
            <h1 className="display mt-5 text-[clamp(2.7rem,6.2vw,4.8rem)]">
              Peak on
              <br />
              <span className="text-flame-2">game day.</span>
              <br />
              Every game day.
            </h1>
            <p className="mt-5 max-w-xl text-[0.98rem] leading-relaxed text-sand">
              CourtReady turns your age, size, position, goal, gear and how you actually feel this morning into the
              best session for <span className="text-cream">today</span> — then periodizes the week so you arrive at
              tip-off springy, not smashed.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/start" className="btn btn-primary !px-5 !py-3 !text-sm">
                Build my free plan
                <span aria-hidden>→</span>
              </Link>
              <button
                type="button"
                className="btn btn-ghost !px-5 !py-3 !text-sm"
                onClick={() => {
                  createDemoAthlete();
                  router.push("/");
                }}
              >
                Explore a demo athlete
              </button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[0.74rem] text-muted">
              <span>✓ No sign-up, no card</span>
              <span>✓ Works with a ball and a court</span>
              <span>✓ Runs 100% in your browser</span>
            </div>
          </div>

          <div className="animate-rise-2 rounded-[1.6rem] border border-white/10 bg-ink-2/85 p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-md">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Sample · 4 days out</p>
              <span className="rounded-full border border-lime/35 bg-lime/10 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-lime">
                Ready 78
              </span>
            </div>
            <h2 className="mt-2.5 text-2xl font-bold tracking-tight">{sample.title}</h2>
            <p className="mt-1 text-[0.78rem] text-muted">
              {sample.phase} · {sample.durationMin} min · load {sample.loadScore}/100
            </p>
            <div className="mt-4 space-y-2">
              {sample.blocks.slice(0, 4).map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line-soft bg-ink/60 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[0.82rem] font-semibold text-cream">{block.title}</p>
                    <p className="truncate text-[0.7rem] text-muted">{block.exercises[0]?.name}</p>
                  </div>
                  <span className="shrink-0 text-[0.7rem] text-sand">{block.durationMin}m</span>
                </div>
              ))}
            </div>
            <p className="mt-3.5 rounded-xl border border-line-soft bg-white/[0.02] px-3 py-2.5 text-[0.74rem] leading-snug text-sand">
              “{sample.whyThis[1] ?? sample.whyThis[0]}”
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SIGNALS.map((signal, index) => (
            <div key={signal.label} className="panel-flat p-4">
              <div className="flex items-center justify-between">
                <p className="text-[0.82rem] font-semibold text-cream">{signal.label}</p>
                <span className="font-mono text-[0.62rem] text-muted">0{index + 1}</span>
              </div>
              <p className="mt-1.5 text-[0.72rem] leading-snug text-muted">{signal.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-4 sm:px-8">
        <SectionHeading
          eyebrow="How it works"
          title="Three minutes in. A smarter week out."
          description="No 60-minute assessment. You give us what actually changes day to day, and the engine handles the programming math."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Build your athlete file",
              body: "Age, height, weight, position, level, goal, session length, gear and any cranky joints. Edit any time.",
            },
            {
              step: "02",
              title: "Check in each morning",
              body: "Five quick signals — sleep, energy, soreness, stress, hydration — become a readiness score out of 100.",
            },
            {
              step: "03",
              title: "Train today, peak on game day",
              body: "Get the full session with cues, sets, loads and fuel. Set your game date and the whole week tapers for it.",
            },
          ].map((item) => (
            <div key={item.step} className="panel p-5">
              <span className="font-mono text-xs text-flame-2">{item.step}</span>
              <h3 className="mt-3 text-lg font-bold leading-tight">{item.title}</h3>
              <p className="mt-2 text-[0.82rem] leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <SectionHeading eyebrow="Inside the engine" title="Not another random workout generator" />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {PILLARS.map((pillar) => (
            <div key={pillar.title} className="panel p-5">
              <p className="eyebrow text-flame-2">{pillar.kicker}</p>
              <h3 className="mt-2 text-lg font-bold leading-tight">{pillar.title}</h3>
              <p className="mt-1.5 text-[0.84rem] leading-relaxed text-muted">{pillar.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
        <div className="panel court-grid relative overflow-hidden p-7 sm:p-10">
          <div className="max-w-2xl">
            <p className="eyebrow">Your move</p>
            <h2 className="display mt-3 text-[clamp(1.9rem,4vw,2.8rem)]">
              Tomorrow&apos;s legs are built today.
            </h2>
            <p className="mt-3 text-[0.92rem] leading-relaxed text-sand">
              Tell CourtReady how you&apos;re feeling and what&apos;s on the calendar. You&apos;ll have a complete, equipment-honest
              session in seconds — and a week that knows when your game is.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/start" className="btn btn-lime !px-5 !py-3 !text-sm">
                Generate today&apos;s workout
              </Link>
              <Link href="/library" className="btn btn-ghost !px-5 !py-3 !text-sm">
                Browse the drill library
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
