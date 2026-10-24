"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { LIBRARY_FILTERS, type Drill } from "@/lib/exercises";
import { demoForDrill } from "@/lib/drill-demos";
import { evidenceForCategory } from "@/lib/exercise-evidence";
import { EQUIPMENT_LABELS, INJURY_LABELS, type Category, type Equipment, type Injury } from "@/lib/types";

const IMPACT_LABELS = ["No impact", "Low impact", "Moderate impact", "High impact"];

export function DrillLibrary({
  drills,
  equipment,
  injuries,
  age,
}: {
  drills: Drill[];
  equipment: Equipment[] | null;
  injuries: Injury[];
  age?: number;
}) {
  const [category, setCategory] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const [fitOnly, setFitOnly] = useState(Boolean(equipment));

  const gear = useMemo(() => new Set<Equipment>([...(equipment ?? []), "bodyweight"]), [equipment]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return drills.filter((drill) => {
      if (category !== "all" && drill.category !== category) return false;
      if (q && !`${drill.name} ${drill.cue} ${drill.category}`.toLowerCase().includes(q)) return false;
      if (fitOnly && equipment) {
        if (drill.gear.some((item) => !gear.has(item))) return false;
        if (drill.minAge && age && drill.minAge > age) return false;
        if (drill.contraindications?.some((injury) => injuries.includes(injury))) return false;
      }
      return true;
    });
  }, [category, query, fitOnly, drills, equipment, gear, injuries, age]);

  return (
    <div>
      <div className="panel p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative w-full sm:max-w-xs">
            <span className="sr-only">Search drills</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search jumps, cuts, shooting…"
              className="field pl-9"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">⌕</span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[0.75rem] text-muted">{filtered.length} drills</span>
            {equipment ? (
              <label className="flex cursor-pointer items-center gap-2 rounded-full border border-line bg-ink-2 px-3 py-1.5 text-[0.74rem] text-sand">
                <input
                  type="checkbox"
                  checked={fitOnly}
                  onChange={(event) => setFitOnly(event.target.checked)}
                  className="h-3.5 w-3.5 accent-[#c9f26b]"
                />
                Only my equipment
              </label>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {LIBRARY_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setCategory(filter.key)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[0.75rem] font-medium transition-colors ${
                category === filter.key
                  ? "border-flame/50 bg-flame/12 text-flame-2"
                  : "border-line bg-ink-2/60 text-muted hover:text-sand"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((drill) => {
          const demo = demoForDrill(drill);
          const evidence = evidenceForCategory(drill.category);
          return (
            <article key={drill.id} className="panel flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[0.92rem] font-bold leading-tight text-cream">{drill.name}</h3>
                <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.1em] text-muted">
                  {drill.category}
                </span>
              </div>
              <p className="mt-1.5 text-[0.78rem] leading-snug text-sand">{drill.cue}</p>
              <div className="mt-3 overflow-hidden rounded-xl border border-line-soft bg-ink-2/80">
                <Image
                  src={demo.src}
                  alt={`${demo.label} movement illustration`}
                  width={240}
                  height={160}
                  unoptimized
                  className="h-[104px] w-full object-contain"
                />
                <p className="border-t border-line-soft px-2.5 py-1.5 text-[0.66rem] text-muted">
                  {demo.label} · schematic loop, not coaching video
                </p>
              </div>
              <details className="mt-2 rounded-lg border border-line-soft bg-white/[0.02] px-2.5 py-2">
                <summary className="cursor-pointer text-[0.72rem] font-semibold text-flame-2">Evidence & safety notes</summary>
                <p className="mt-2 text-[0.7rem] leading-relaxed text-sand">{evidence.note}</p>
                <ul className="mt-2 space-y-1.5">
                  {evidence.references.map((reference) => (
                    <li key={reference.id}>
                      <a
                        href={reference.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[0.68rem] font-medium leading-snug text-lime underline decoration-lime/40 underline-offset-2 hover:decoration-lime"
                      >
                        {reference.organization} ({reference.year}): {reference.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
              <div className="mt-auto pt-3">
                <div className="flex items-center justify-between gap-2 border-t border-line-soft pt-2.5">
                  <p className="text-[0.74rem] font-semibold text-flame-2">{drill.dose.intermediate}</p>
                  <span className="text-[0.62rem] uppercase tracking-[0.1em] text-muted">
                    {IMPACT_LABELS[drill.impact]}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {drill.gear.length > 0 ? (
                    drill.gear.map((item) => (
                      <span key={item} className="rounded border border-line-soft bg-white/[0.02] px-1.5 py-0.5 text-[0.62rem] text-sand">
                        {EQUIPMENT_LABELS[item]}
                      </span>
                    ))
                  ) : (
                    <span className="rounded border border-line-soft bg-white/[0.02] px-1.5 py-0.5 text-[0.62rem] text-sand">
                      Bodyweight
                    </span>
                  )}
                  {drill.contraindications?.map((injury) => (
                    <span key={injury} className="rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[0.62rem] text-amber-200">
                      caution: {INJURY_LABELS[injury]}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="panel mt-4 p-6">
          <p className="text-sm text-muted">
            No drills match that combination. Clear the search or turn off the equipment filter.
          </p>
        </div>
      ) : null}
    </div>
  );
}
