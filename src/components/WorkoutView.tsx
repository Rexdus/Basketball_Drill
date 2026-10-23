"use client";

import Link from "next/link";
import { useState } from "react";
import type { StoredWorkout } from "@/lib/store";
import { completeWorkout, skipWorkout } from "@/lib/store";
import type { Units, WorkoutPlan } from "@/lib/types";
import { formatWeight } from "@/lib/units";
import { Badge, IntensityBadge, Meter } from "./ui";

const TYPE_ICON: Record<string, string> = {
  warmup: "🔥",
  mobility: "🧘",
  plyo: "⚡",
  power: "💥",
  strength: "🏋️",
  agility: "🛡️",
  conditioning: "🫁",
  skill: "🎯",
  core: "🧱",
  recovery: "🌙",
  mixed: "🩹",
};

export function WorkoutView({
  plan,
  workout,
  showActions = true,
  bodyWeightKg = 75,
  units = "metric",
}: {
  plan: WorkoutPlan;
  workout?: StoredWorkout | null;
  showActions?: boolean;
  bodyWeightKg?: number;
  units?: Units;
}) {
  const [rpe, setRpe] = useState(7);
  const [feedback, setFeedback] = useState("");
  const completed = workout?.status === "completed";
  const skipped = workout?.status === "skipped";
  const proteinPct = Math.round((plan.nutrition.proteinG / (bodyWeightKg * 2.3)) * 100);
  const carbsPct = Math.round((plan.nutrition.carbsG / (bodyWeightKg * 7)) * 100);
  const waterPct = Math.round((plan.nutrition.waterMl / (bodyWeightKg * 50)) * 100);

  return (
    <div className="space-y-5">
      <div className="panel overflow-hidden">
        <div className="border-b border-line-soft bg-gradient-to-br from-flame/[0.13] via-transparent to-transparent p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="flame">{plan.phase}</Badge>
                <IntensityBadge intensity={plan.intensity} />
                <Badge tone="outline">{plan.durationMin} min</Badge>
                {completed ? <Badge tone="lime">✓ Completed</Badge> : null}
                {skipped ? <Badge tone="warn">Skipped</Badge> : null}
              </div>
              <h2 className="display mt-3 text-3xl text-cream sm:text-4xl">{plan.title}</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-sand">{plan.summary}</p>
            </div>
            <div className="w-full max-w-[15rem] rounded-2xl border border-line bg-ink/60 p-4">
              <div className="flex items-baseline justify-between">
                <span className="eyebrow">Readiness</span>
                <span className="text-2xl font-bold text-cream">{plan.readinessScore}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#22261d]">
                <div
                  className={`h-full rounded-full ${
                    plan.readinessScore >= 70 ? "bg-lime" : plan.readinessScore >= 50 ? "bg-amber-400" : "bg-flame"
                  }`}
                  style={{ width: `${Math.min(100, plan.readinessScore)}%` }}
                />
              </div>
              <p className="mt-2 text-[0.72rem] text-muted">{plan.readinessLabel} · target load {plan.loadScore}/100</p>
            </div>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.55fr_1fr]">
          <div className="divide-y divide-line-soft">
            {plan.blocks.map((block, blockIndex) => (
              <section key={`${block.id}-${blockIndex}`} className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-white/[0.03] text-sm">
                      {TYPE_ICON[block.type] ?? "🏀"}
                    </span>
                    <div>
                      <h3 className="text-[0.98rem] font-bold leading-tight text-cream">{block.title}</h3>
                      <p className="text-[0.7rem] text-muted">{block.intent}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-line px-2 py-0.5 text-[0.68rem] text-sand">
                    {block.durationMin} min
                  </span>
                </div>

                <ul className="mt-3 space-y-2">
                  {block.exercises.map((exercise, index) => (
                    <li
                      key={`${exercise.name}-${index}`}
                      className="rounded-xl border border-line-soft bg-ink-2/70 px-3.5 py-3"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <p className="text-[0.88rem] font-semibold text-cream">{exercise.name}</p>
                        <p className="text-[0.78rem] font-semibold text-flame-2">{exercise.dose}</p>
                      </div>
                      <p className="mt-1 text-[0.76rem] leading-snug text-muted">{exercise.cue}</p>
                      {exercise.load || exercise.rest ? (
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.68rem] uppercase tracking-[0.08em] text-[#7f8676]">
                          {exercise.load ? <span>{exercise.load}</span> : null}
                          {exercise.rest ? <span>{exercise.rest}</span> : null}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <aside className="space-y-5 border-t border-line-soft p-5 sm:p-6 lg:border-l lg:border-t-0">
            <div>
              <p className="eyebrow">Why this session</p>
              <ul className="mt-2 space-y-2">
                {plan.whyThis.map((reason, index) => (
                  <li key={index} className="flex gap-2 text-[0.8rem] leading-snug text-sand">
                    <span className="mt-[0.35rem] h-1.5 w-1.5 shrink-0 rounded-full bg-flame" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="panel-flat p-3.5">
              <p className="eyebrow">Fuel today</p>
              <div className="mt-2.5 space-y-2.5">
                <Meter value={proteinPct} label={`Protein ${plan.nutrition.proteinG} g`} />
                <Meter value={carbsPct} label={`Carbs ${plan.nutrition.carbsG} g`} />
                <Meter value={waterPct} label={`Water ${(plan.nutrition.waterMl / 1000).toFixed(1)} L`} />
              </div>
              <p className="mt-2 text-[0.68rem] leading-snug text-[#7f8676]">
                Daily targets for roughly {formatWeight(bodyWeightKg, units)} of body mass.
              </p>
              <p className="mt-3 text-[0.74rem] leading-snug text-muted">{plan.nutrition.recoveryTip}</p>
            </div>

            {plan.cautions.length > 0 ? (
              <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.07] p-3.5">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-amber-200">
                  Adjusted for you
                </p>
                <ul className="mt-2 space-y-1.5">
                  {plan.cautions.map((caution, index) => (
                    <li key={index} className="text-[0.76rem] leading-snug text-amber-100/85">
                      {caution}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="panel-flat p-3.5">
              <p className="eyebrow">Finisher</p>
              <p className="mt-1.5 text-[0.8rem] leading-snug text-sand">{plan.finisher}</p>
            </div>

            {showActions && workout ? (
              completed ? (
                <div className="rounded-xl border border-lime/30 bg-lime/[0.07] p-3.5">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-lime">
                    Session logged · RPE {workout.rpe ?? "–"}/10
                  </p>
                  <p className="mt-1.5 text-[0.78rem] text-sand">
                    {workout.feedback || "Nice work. Session load banked."}
                  </p>
                </div>
              ) : skipped ? (
                <div className="rounded-xl border border-line bg-ink-2/80 p-3.5">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">Marked skipped</p>
                  <p className="mt-1.5 text-[0.78rem] text-sand">
                    {workout.feedback || "Rest counts too. Tomorrow's session will adapt."}
                  </p>
                  <Link href="/plan" className="mt-3 inline-flex text-[0.78rem] font-semibold text-flame-2">
                    See the next session →
                  </Link>
                </div>
              ) : (
                <div className="rounded-xl border border-line bg-ink-2/80 p-3.5">
                  <p className="eyebrow">Log the work</p>
                  <label className="field-label mt-2.5" htmlFor="rpe">
                    How hard was it? (RPE)
                  </label>
                  <select
                    id="rpe"
                    className="field"
                    value={rpe}
                    onChange={(event) => setRpe(Number(event.target.value))}
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
                      <option key={value} value={value}>
                        {value} ·{" "}
                        {value <= 3
                          ? "Very easy"
                          : value <= 5
                            ? "Easy"
                            : value <= 7
                              ? "Solid work"
                              : value <= 9
                                ? "Hard"
                                : "Everything I had"}
                      </option>
                    ))}
                  </select>
                  <label className="field-label mt-2.5" htmlFor="feedback">
                    Notes (optional)
                  </label>
                  <textarea
                    id="feedback"
                    rows={2}
                    className="field"
                    placeholder="Knees felt great, jumps felt springy…"
                    maxLength={300}
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-primary mt-3 w-full"
                    onClick={() => completeWorkout(workout.id, rpe, feedback)}
                  >
                    Mark session complete
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost mt-2 w-full !text-[0.78rem]"
                    onClick={() => skipWorkout(workout.id, feedback)}
                  >
                    Rest today instead
                  </button>
                </div>
              )
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
