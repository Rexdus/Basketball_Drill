"use client";

import { useState } from "react";
import type { TrainingActivity, TrainingActivityType, Units } from "@/lib/types";
import { deleteTrainingActivity, saveTrainingActivity } from "@/lib/store";
import { prettyDate, todayISO } from "@/lib/engine";
import { Badge } from "./ui";

const ACTIVITY_LABELS: Record<TrainingActivityType, string> = {
  practice: "Team practice",
  pickup: "Pickup game",
  game: "Organized game",
  "indoor-bike": "Indoor bike workout",
  "outdoor-bike": "Outdoor bike workout",
};

function isBike(type: TrainingActivityType): boolean {
  return type === "indoor-bike" || type === "outdoor-bike";
}

function formatDistance(distanceKm: number, units: Units): string {
  return units === "imperial"
    ? `${Math.round((distanceKm / 1.609344) * 10) / 10} mi`
    : `${Math.round(distanceKm * 10) / 10} km`;
}

export function ActivityLog({
  activities,
  units = "metric",
}: {
  activities: TrainingActivity[];
  units?: Units;
}) {
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState<TrainingActivityType>("practice");
  const [duration, setDuration] = useState(60);
  const [rpe, setRpe] = useState(6);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const form = new FormData(event.currentTarget);
      const distanceValue = String(form.get("activityDistance") ?? "").trim();
      const distanceInput = distanceValue ? Number(distanceValue) : null;
      saveTrainingActivity({
        date,
        type,
        durationMin: duration,
        rpe,
        distanceKm: distanceInput !== null && Number.isFinite(distanceInput)
          ? units === "imperial" ? distanceInput * 1.609344 : distanceInput
          : null,
        notes: String(form.get("activityNotes") ?? ""),
      });
      setMessage(`${ACTIVITY_LABELS[type]} added. Recent workload will shape your next session.`);
      event.currentTarget.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save that activity. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Training load</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-cream">Log a workout or court activity</h2>
          <p className="mt-1 max-w-2xl text-[0.78rem] leading-relaxed text-muted">
            Record practices, pickup, games, or indoor and outdoor bike workouts. Duration and effort help CourtReady account for your recent training load.
          </p>
        </div>
        <Badge tone="outline">{activities.length} logged</Badge>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <label className="field-label" htmlFor="activity-type">Activity</label>
          <select
            id="activity-type"
            className="field"
            value={type}
            onChange={(event) => setType(event.target.value as TrainingActivityType)}
          >
            {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="activity-date">Date</label>
          <input
            id="activity-date"
            type="date"
            className="field"
            value={date}
            max={todayISO()}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </div>
        <div>
          <label className="field-label" htmlFor="activity-duration">Minutes</label>
          <input
            id="activity-duration"
            type="number"
            min={5}
            max={360}
            step={5}
            className="field"
            value={duration}
            onChange={(event) => setDuration(Number(event.target.value))}
            required
          />
        </div>
        <div>
          <label className="field-label" htmlFor="activity-rpe">Effort · {rpe}/10</label>
          <input
            id="activity-rpe"
            type="range"
            min={1}
            max={10}
            step={1}
            className="mt-2 w-full"
            value={rpe}
            onChange={(event) => setRpe(Number(event.target.value))}
          />
        </div>
        {isBike(type) ? (
          <div>
            <label className="field-label" htmlFor="activity-distance">Distance · optional</label>
            <input
              id="activity-distance"
              name="activityDistance"
              type="number"
              min={0.1}
              max={units === "imperial" ? 621 : 1000}
              step={0.1}
              className="field"
              placeholder={units === "imperial" ? "mi" : "km"}
            />
          </div>
        ) : null}
        <div className="sm:col-span-2 lg:col-span-6">
          <label className="field-label" htmlFor="activity-notes">Notes (optional)</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="activity-notes"
              name="activityNotes"
              type="text"
              className="field"
              placeholder="e.g. full-court scrimmage, lots of sprinting"
              maxLength={300}
            />
            <button type="submit" className="btn btn-primary shrink-0" disabled={pending}>
              {pending ? "Saving…" : "Add to log"}
            </button>
          </div>
          {message ? <p className="mt-2 text-[0.74rem] text-lime" role="status">{message}</p> : null}
        </div>
      </form>

      {activities.length > 0 ? (
        <div className="mt-5 border-t border-line-soft pt-4">
          <p className="eyebrow">Recent logged activity</p>
          <ul className="mt-2 divide-y divide-line-soft">
            {activities.slice(0, 12).map((activity) => (
              <li key={activity.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-1">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[0.84rem] font-semibold text-cream">{ACTIVITY_LABELS[activity.type]}</p>
                    <Badge tone="outline">RPE {activity.rpe}/10</Badge>
                  </div>
                  <p className="mt-0.5 text-[0.72rem] text-muted">
                    {prettyDate(activity.date)} · {activity.durationMin} min
                    {activity.distanceKm ? ` · ${formatDistance(activity.distanceKm, units)}` : ""}
                    {activity.notes ? ` · ${activity.notes}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-[0.72rem] font-medium text-muted transition-colors hover:text-flame-2"
                  onClick={() => deleteTrainingActivity(activity.id)}
                  aria-label={`Delete ${ACTIVITY_LABELS[activity.type]} from ${activity.date}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
