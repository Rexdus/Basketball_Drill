"use client";

import Link from "next/link";
import { DrillLibrary } from "@/components/DrillLibrary";
import { Badge, SectionHeading } from "@/components/ui";
import { useStore } from "@/lib/store";
import { DRILLS, LIBRARY_FILTERS } from "@/lib/exercises";

export default function LibraryPage() {
  const { athlete } = useStore();

  const counts = DRILLS.reduce<Record<string, number>>((acc, drill) => {
    acc[drill.category] = (acc[drill.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-6xl px-5 pb-12 pt-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Drill library</p>
          <h1 className="display mt-2 text-[clamp(2.1rem,5vw,3.1rem)]">{DRILLS.length} drills, zero fluff.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sand">
            Every drill the engine can prescribe — with coaching cues, dose progressions, equipment requirements, an
            original looping movement sketch, and category-specific evidence and safety references.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {athlete ? (
            <Badge tone="lime">
              Filterable for {athlete.position === "unsure" ? "your profile" : athlete.position}
            </Badge>
          ) : (
            <Link href="/start" className="btn btn-ghost !py-2 !text-[0.78rem]">
              Personalise my plan
            </Link>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {LIBRARY_FILTERS.filter((f) => f.key !== "all").map((filter) => (
          <span
            key={filter.key}
            className="rounded-full border border-line-soft bg-ink-2/60 px-2.5 py-1 text-[0.68rem] text-muted"
          >
            {filter.label} <span className="text-sand">{counts[filter.key] ?? 0}</span>
          </span>
        ))}
      </div>

      <div id="movement-evidence" className="mt-5 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-4">
        <p className="text-[0.78rem] font-semibold text-amber-100">Evidence-aware, not clinically validated</p>
        <p className="mt-1 text-[0.74rem] leading-relaxed text-sand">
          Reputable guidance informs the categories and safety cues below; it does not validate every drill, exact set/rep
          dose, or an individual athlete&apos;s readiness. Looping stick-figure sketches are original visual aids, not
          coaching videos. Stop for pain, and get qualified coaching for loaded or high-impact work—especially for youth.
        </p>
      </div>

      <div className="mt-6">
        <DrillLibrary
          drills={DRILLS}
          equipment={athlete ? athlete.equipment : null}
          injuries={athlete ? athlete.injuries : []}
          age={athlete?.age}
        />
      </div>

      <section className="panel mt-8 p-5 sm:p-6">
        <SectionHeading
          eyebrow="How drills get picked"
          title="The selection rules"
          description="Understanding the filter makes your session make sense."
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            ["Impact filter", "Readiness, training timing, flagged injuries and conservative youth age bands filter higher-impact drills; BMI is not used as a proxy for movement readiness."],
            ["Equipment honesty", "A drill is only eligible if every piece of gear it needs is in your profile."],
            ["Dose by level", "Beginners get technique reps, advanced athletes get more sets and higher intent."],
          ].map(([title, body]) => (
            <div key={title} className="panel-flat p-4">
              <p className="text-[0.84rem] font-semibold text-cream">{title}</p>
              <p className="mt-1 text-[0.76rem] leading-snug text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
