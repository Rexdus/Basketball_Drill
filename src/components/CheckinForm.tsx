"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveCheckinAction, type ActionState } from "@/app/actions";
import { FEELING_LABELS, SORE_AREAS, type CheckinInput, type Feeling } from "@/lib/types";

const initial: ActionState = { ok: false, message: "" };

const SCALES: {
  name: keyof Pick<CheckinInput, "energy" | "soreness" | "stress" | "hydration">;
  label: string;
  low: string;
  high: string;
  hint: string;
}[] = [
  { name: "energy", label: "Energy", low: "Empty", high: "Buzzing", hint: "How much pop do you have?" },
  { name: "soreness", label: "Soreness", low: "None", high: "Beat up", hint: "Muscle soreness right now" },
  { name: "stress", label: "Life stress", low: "Calm", high: "Maxed", hint: "Work, school, sleep pressure" },
  { name: "hydration", label: "Hydration", low: "Dry", high: "Great", hint: "Honest answer, not aspirational" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={pending}>
      {pending ? "Scoring readiness…" : "Score readiness & build session"}
    </button>
  );
}

export function CheckinForm({ existing }: { existing: CheckinInput | null }) {
  const [state, formAction] = useActionState(saveCheckinAction, initial);
  const [sleep, setSleep] = useState(existing?.sleepHours ?? 7.5);
  const [feeling, setFeeling] = useState<Feeling>(existing?.feeling ?? "good");

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between">
            <label className="field-label" htmlFor="sleepHours">
              Sleep last night
            </label>
            <span className="text-xs font-semibold text-flame-2">{sleep.toFixed(1)} h</span>
          </div>
          <input
            id="sleepHours"
            name="sleepHours"
            type="range"
            min={3}
            max={11}
            step={0.5}
            value={sleep}
            onChange={(event) => setSleep(Number(event.target.value))}
            className="w-full"
          />
        </div>

        {SCALES.map((scale) => (
          <div key={scale.name}>
            <div className="flex items-center justify-between">
              <label className="field-label" htmlFor={scale.name}>
                {scale.label}
              </label>
              <span className="text-[0.68rem] text-muted">{scale.hint}</span>
            </div>
            <input
              id={scale.name}
              name={scale.name}
              type="range"
              min={1}
              max={5}
              step={1}
              defaultValue={existing?.[scale.name] ?? 3}
              className="w-full"
            />
            <div className="flex justify-between text-[0.62rem] uppercase tracking-wide text-muted">
              <span>{scale.low}</span>
              <span>{scale.high}</span>
            </div>
          </div>
        ))}
      </div>

      <div>
        <p className="field-label">How do you feel overall?</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {(Object.keys(FEELING_LABELS) as Feeling[]).map((key) => (
            <label
              key={key}
              className={`cursor-pointer rounded-xl border px-2.5 py-2 text-center text-[0.72rem] font-semibold leading-tight transition-colors ${
                feeling === key
                  ? "border-flame/60 bg-flame/10 text-cream"
                  : "border-line bg-ink-2/70 text-sand hover:border-[#3a4033]"
              }`}
            >
              <input
                type="radio"
                name="feeling"
                value={key}
                className="sr-only"
                checked={feeling === key}
                onChange={() => setFeeling(key)}
              />
              {FEELING_LABELS[key].split(" — ")[0]}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="field-label">Sore anywhere specific? (optional)</p>
        <div className="flex flex-wrap gap-2">
          {SORE_AREAS.map((area) => (
            <label
              key={area}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-ink-2/70 px-2.5 py-1.5 text-[0.72rem] text-sand transition-colors has-[:checked]:border-lime/50 has-[:checked]:bg-lime/10 has-[:checked]:text-cream"
            >
              <input
                type="checkbox"
                name="soreAreas"
                value={area}
                defaultChecked={existing?.soreAreas.includes(area)}
                className="h-3 w-3 accent-[#c9f26b]"
              />
              {area}
            </label>
          ))}
        </div>
      </div>

      {state.message ? (
        <p
          className={`rounded-xl border px-4 py-3 text-sm ${
            state.ok ? "border-lime/40 bg-lime/10 text-lime" : "border-flame/40 bg-flame/10 text-flame-2"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <SubmitButton />
        <p className="text-[0.72rem] text-muted">
          Today's plan is recalculated instantly. Re-submit any time your body changes.
        </p>
      </div>
    </form>
  );
}
