"use client";

import { useState } from "react";
import { saveAthlete, type AthleteInput } from "@/lib/store";
import {
  EQUIPMENT_LABELS,
  EXPERIENCE_LABELS,
  GOAL_LABELS,
  INJURY_LABELS,
  POSITION_LABELS,
  type AthleteProfile,
  type Equipment,
  type Experience,
  type Goal,
  type Injury,
  type Position,
} from "@/lib/types";

const EQUIPMENT_ORDER: Equipment[] = [
  "bodyweight",
  "dumbbells",
  "bands",
  "barbell",
  "medicine-ball",
  "box",
  "ball",
  "hoop",
  "court",
];
const INJURY_ORDER: Injury[] = ["knee", "ankle", "back", "shoulder", "hamstring"];

function Segmented<T extends string>({
  name,
  options,
  defaultValue,
  columns = 2,
}: {
  name: string;
  options: { value: T; label: string; hint?: string }[];
  defaultValue?: T;
  columns?: number;
}) {
  const [value, setValue] = useState<T | undefined>(defaultValue);
  return (
    <div className={`grid gap-2 ${columns === 3 ? "sm:grid-cols-3" : columns === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <label
            key={option.value}
            className={`cursor-pointer rounded-xl border px-3 py-2.5 transition-colors ${
              active
                ? "border-flame/60 bg-flame/10 text-cream shadow-[0_0_0_1px_rgba(255,90,31,0.18)]"
                : "border-line bg-ink-2/70 text-sand hover:border-[#3a4033]"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={active}
              className="sr-only"
              onChange={() => setValue(option.value)}
            />
            <span className="block text-[0.82rem] font-semibold leading-tight">{option.label}</span>
            {option.hint ? <span className="mt-0.5 block text-[0.68rem] text-muted">{option.hint}</span> : null}
          </label>
        );
      })}
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseProfileForm(form: HTMLFormElement): AthleteInput {
  const data = new FormData(form);
  const text = (key: string) => String(data.get(key) ?? "").trim();
  const num = (key: string, fallback: number) => {
    const value = Number(text(key));
    return Number.isFinite(value) ? value : fallback;
  };
  const list = (key: string) =>
    data
      .getAll(key)
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);

  const gameDateRaw = text("gameDate");
  return {
    name: text("name") || "Hooper",
    age: clamp(Math.round(num("age", 20)), 10, 80),
    heightCm: clamp(Math.round(num("heightCm", 180)), 120, 230),
    weightKg: clamp(Math.round(num("weightKg", 75) * 10) / 10, 35, 200),
    position: (list("position")[0] ?? "unsure") as Position,
    experience: (list("experience")[0] ?? "intermediate") as Experience,
    goal: (list("goal")[0] ?? "balanced") as Goal,
    daysPerWeek: clamp(Math.round(num("daysPerWeek", 4)), 1, 7),
    minutes: clamp(Math.round(num("minutes", 55) / 5) * 5, 20, 120),
    gameDate: /^\d{4}-\d{2}-\d{2}$/.test(gameDateRaw) ? gameDateRaw : null,
    equipment: list("equipment").filter((e): e is Equipment =>
      (EQUIPMENT_ORDER as string[]).includes(e),
    ),
    injuries: list("injuries").filter((i): i is Injury => (INJURY_ORDER as string[]).includes(i)),
    notes: text("notes") || null,
  };
}

export function ProfileForm({
  profile,
  mode = "create",
  onSaved,
}: {
  profile?: AthleteProfile | null;
  mode?: "create" | "edit";
  onSaved?: () => void;
}) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [minutes, setMinutes] = useState(profile?.minutes ?? 55);
  const [days, setDays] = useState(profile?.daysPerWeek ?? 4);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const input = parseProfileForm(event.currentTarget);
      if (!input.heightCm || !input.weightKg) {
        setMessage({ ok: false, text: "Add a valid height and weight so we can size your sessions." });
        return;
      }
      saveAthlete(input);
      setMessage({
        ok: true,
        text:
          mode === "edit"
            ? "Profile saved. Today's session has been rebuilt around the new details."
            : "Profile saved — generating your plan.",
      });
      onSaved?.();
    } catch {
      setMessage({ ok: false, text: "Something went wrong saving your profile. Try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="panel p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">01 · Athlete</p>
            <h3 className="mt-1 text-lg font-semibold">Who is training?</h3>
          </div>
          <span className="hidden text-[0.7rem] text-muted sm:block">Used to size every session</span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <div className="sm:col-span-4">
            <label className="field-label" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              name="name"
              className="field"
              placeholder="Your name"
              defaultValue={profile?.name ?? ""}
              maxLength={60}
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="age">
              Age
            </label>
            <input
              id="age"
              name="age"
              type="number"
              min={10}
              max={80}
              className="field"
              defaultValue={profile?.age ?? 20}
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="heightCm">
              Height (cm)
            </label>
            <input
              id="heightCm"
              name="heightCm"
              type="number"
              min={120}
              max={230}
              className="field"
              defaultValue={profile?.heightCm ?? 180}
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="weightKg">
              Weight (kg)
            </label>
            <input
              id="weightKg"
              name="weightKg"
              type="number"
              min={35}
              max={200}
              step="0.1"
              className="field"
              defaultValue={profile?.weightKg ?? 75}
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="gameDate">
              Next game
            </label>
            <input
              id="gameDate"
              name="gameDate"
              type="date"
              className="field"
              defaultValue={profile?.gameDate ?? ""}
            />
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className="field-label">Position</legend>
          <Segmented<Position>
            name="position"
            defaultValue={profile?.position ?? "guard"}
            columns={4}
            options={(Object.keys(POSITION_LABELS) as Position[]).map((key) => ({
              value: key,
              label: POSITION_LABELS[key],
            }))}
          />
        </fieldset>

        <fieldset className="mt-5">
          <legend className="field-label">Experience</legend>
          <Segmented<Experience>
            name="experience"
            defaultValue={profile?.experience ?? "intermediate"}
            columns={3}
            options={(Object.keys(EXPERIENCE_LABELS) as Experience[]).map((key) => ({
              value: key,
              label: EXPERIENCE_LABELS[key],
            }))}
          />
        </fieldset>
      </div>

      <div className="panel p-5 sm:p-6">
        <p className="eyebrow">02 · Goal</p>
        <h3 className="mt-1 text-lg font-semibold">What should the engine prioritise?</h3>
        <div className="mt-4">
          <Segmented<Goal>
            name="goal"
            defaultValue={profile?.goal ?? "vertical"}
            columns={2}
            options={(Object.keys(GOAL_LABELS) as Goal[]).map((key) => ({
              value: key,
              label: GOAL_LABELS[key],
            }))}
          />
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <div className="flex items-center justify-between">
              <label className="field-label" htmlFor="minutes">
                Session length
              </label>
              <span className="text-xs font-semibold text-flame-2">{minutes} min</span>
            </div>
            <input
              id="minutes"
              name="minutes"
              type="range"
              min={20}
              max={120}
              step={5}
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
              className="w-full"
            />
            <p className="mt-1 text-[0.7rem] text-muted">How long you can realistically train on a normal day.</p>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="field-label" htmlFor="daysPerWeek">
                Days per week
              </label>
              <span className="text-xs font-semibold text-flame-2">{days} days</span>
            </div>
            <input
              id="daysPerWeek"
              name="daysPerWeek"
              type="range"
              min={1}
              max={7}
              step={1}
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              className="w-full"
            />
            <p className="mt-1 text-[0.7rem] text-muted">Includes games. We keep 2 hard days apart.</p>
          </div>
        </div>
      </div>

      <div className="panel p-5 sm:p-6">
        <p className="eyebrow">03 · Environment & body</p>
        <h3 className="mt-1 text-lg font-semibold">What can you train with?</h3>
        <p className="mt-1 text-sm text-muted">
          Every prescription is filtered to this list — no imaginary equipment in your session.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {EQUIPMENT_ORDER.map((item) => (
            <label
              key={item}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-line bg-ink-2/70 px-3 py-2 text-[0.78rem] text-sand transition-colors has-[:checked]:border-lime/60 has-[:checked]:bg-lime/10 has-[:checked]:text-cream"
            >
              <input
                type="checkbox"
                name="equipment"
                value={item}
                defaultChecked={
                  profile ? profile.equipment.includes(item) : item !== "barbell"
                }
                className="h-3.5 w-3.5 accent-[#c9f26b]"
              />
              {EQUIPMENT_LABELS[item]}
            </label>
          ))}
        </div>

        <fieldset className="mt-5">
          <legend className="field-label">Injuries or sensitive areas</legend>
          <div className="flex flex-wrap gap-2">
            {INJURY_ORDER.map((item) => (
              <label
                key={item}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-line bg-ink-2/70 px-3 py-2 text-[0.78rem] text-sand transition-colors has-[:checked]:border-flame/60 has-[:checked]:bg-flame/10 has-[:checked]:text-cream"
              >
                <input
                  type="checkbox"
                  name="injuries"
                  value={item}
                  defaultChecked={profile?.injuries.includes(item)}
                  className="h-3.5 w-3.5 accent-[#ff5a1f]"
                />
                {INJURY_LABELS[item]}
              </label>
            ))}
          </div>
          <p className="mt-2 text-[0.7rem] text-muted">
            Nothing selected? Great — we&apos;ll still cap high-impact work by age and body mass.
          </p>
        </fieldset>

        <div className="mt-5">
          <label className="field-label" htmlFor="notes">
            Anything else the coach should know?
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="field"
            placeholder="League night is Tuesday, I have a desk job, right ankle gets grumpy on back-to-backs…"
            defaultValue={profile?.notes ?? ""}
            maxLength={500}
          />
        </div>
      </div>

      {message ? (
        <p
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.ok
              ? "border-lime/40 bg-lime/10 text-lime"
              : "border-flame/40 bg-flame/10 text-flame-2"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={pending}>
          {pending ? "Saving…" : mode === "edit" ? "Save & rebuild today's session" : "Generate my plan"}
        </button>
        <p className="text-[0.72rem] text-muted">
          {mode === "edit"
            ? "Saving rebuilds today's session with your new data."
            : "You'll land on today's session with a readiness check-in."}
        </p>
      </div>
    </form>
  );
}
