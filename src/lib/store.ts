"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  addDays,
  buildWorkout,
  computeReadiness,
  daysToGame,
  todayISO,
} from "@/lib/engine";
import type {
  AthleteProfile,
  CheckinInput,
  Goal,
  Intensity,
  WorkoutPlan,
} from "@/lib/types";

/**
 * CourtReady is a static app: it runs entirely in the browser and keeps each
 * athlete's data in localStorage. That is what makes it deployable to GitHub
 * Pages with zero backend. Use the export/import tools on the profile page to
 * back up or move your data between devices.
 */

const NS = "courtready";
const VERSION = 1;
const KEYS = {
  athlete: `${NS}:v${VERSION}:athlete`,
  checkins: `${NS}:v${VERSION}:checkins`,
  workouts: `${NS}:v${VERSION}:workouts`,
} as const;

export type StoredAthlete = AthleteProfile & {
  publicId: string;
  isDemo?: boolean;
  updatedAt: string;
};

export type AthleteInput = Omit<AthleteProfile, "id"> & { id?: number };

export type StoredCheckin = CheckinInput & {
  date: string;
  readiness: number;
};

export type StoredWorkout = {
  id: number;
  date: string;
  title: string;
  focus: Goal;
  phase: string;
  intensity: Intensity;
  durationMin: number;
  loadScore: number;
  readinessScore: number;
  plan: WorkoutPlan;
  status: "planned" | "completed" | "skipped";
  rpe: number | null;
  feedback: string | null;
  completedAt: string | null;
};

export type StoreSnapshot = {
  athlete: StoredAthlete | null;
  checkins: StoredCheckin[];
  workouts: StoredWorkout[];
};

/* ------------------------------------------------------------- primitives */

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function removeKey(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ------------------------------------------------------------ raw access */

export function getAthlete(): StoredAthlete | null {
  const athlete = readJSON<StoredAthlete | null>(KEYS.athlete, null);
  // Normalize legacy profiles that predate the units preference.
  if (athlete && !athlete.units) athlete.units = "metric";
  return athlete;
}

export function listCheckins(): StoredCheckin[] {
  const list = readJSON<StoredCheckin[]>(KEYS.checkins, []);
  return [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getCheckin(date: string): StoredCheckin | null {
  return listCheckins().find((row) => row.date === date) ?? null;
}

export function listWorkouts(): StoredWorkout[] {
  const list = readJSON<StoredWorkout[]>(KEYS.workouts, []);
  return [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getWorkout(date: string): StoredWorkout | null {
  return listWorkouts().find((row) => row.date === date) ?? null;
}

/* ------------------------------------------------------------- derived */

export function recentHardLoad(workouts: StoredWorkout[]): number {
  const cutoff = addDays(todayISO(), -2);
  return workouts
    .filter((row) => row.status === "completed" && row.date >= cutoff)
    .reduce((acc, row) => acc + row.loadScore / 30, 0);
}

export function readinessForDate(checkins: StoredCheckin[], date = todayISO()): number {
  return checkins.find((row) => row.date === date)?.readiness ?? 72;
}

export function streakOf(workouts: StoredWorkout[]): number {
  const completedDates = new Set(
    workouts.filter((row) => row.status === "completed").map((row) => row.date),
  );
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 90; i += 1) {
    const iso = `${cursor.getFullYear()}-${`${cursor.getMonth() + 1}`.padStart(2, "0")}-${`${cursor.getDate()}`.padStart(2, "0")}`;
    if (completedDates.has(iso)) {
      streak += 1;
    } else if (i > 0) {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/* ------------------------------------------------------------ mutations */

function nextWorkoutId(workouts: StoredWorkout[]): number {
  return workouts.reduce((max, row) => Math.max(max, row.id), 0) + 1;
}

function upsertWorkout(workout: StoredWorkout): void {
  const list = listWorkouts().filter((row) => row.date !== workout.date);
  list.push(workout);
  list.sort((a, b) => (a.date < b.date ? 1 : -1));
  writeJSON(KEYS.workouts, list);
}

function generateFor(
  athlete: StoredAthlete,
  date: string,
  readinessOverride?: number,
): StoredWorkout {
  const workouts = listWorkouts();
  const hardLoad = recentHardLoad(workouts);
  const checkin = getCheckin(date);
  const input: CheckinInput | null = checkin
    ? {
        sleepHours: checkin.sleepHours,
        energy: checkin.energy,
        soreness: checkin.soreness,
        stress: checkin.stress,
        hydration: checkin.hydration,
        feeling: checkin.feeling,
        soreAreas: checkin.soreAreas ?? [],
        notes: checkin.notes,
      }
    : null;
  const readiness =
    readinessOverride ?? (input ? computeReadiness(input, hardLoad) : 72);
  const plan = buildWorkout({
    profile: athlete,
    checkin: input,
    readiness,
    date,
    days: daysToGame(athlete, date),
    recentLoad: hardLoad,
  });
  const workout: StoredWorkout = {
    id: nextWorkoutId(workouts),
    date,
    title: plan.title,
    focus: plan.focus,
    phase: plan.phase,
    intensity: plan.intensity,
    durationMin: plan.durationMin,
    loadScore: plan.loadScore,
    readinessScore: plan.readinessScore,
    plan,
    status: "planned",
    rpe: null,
    feedback: null,
    completedAt: null,
  };
  upsertWorkout(workout);
  return workout;
}

export function ensureTodayWorkout(athlete = getAthlete()): StoredWorkout | null {
  if (!athlete) return null;
  const existing = getWorkout(todayISO());
  if (existing) return existing;
  const workout = generateFor(athlete, todayISO());
  refresh();
  return workout;
}

export function regenerateToday(athlete = getAthlete()): StoredWorkout | null {
  if (!athlete) return null;
  const today = todayISO();
  const list = listWorkouts().filter((row) => row.date !== today);
  writeJSON(KEYS.workouts, list);
  const workout = generateFor(athlete, today);
  refresh();
  return workout;
}

export function saveAthlete(input: AthleteInput): StoredAthlete {
  const existing = getAthlete();
  const athlete: StoredAthlete = {
    ...input,
    id: existing?.id ?? input.id ?? 1,
    publicId: existing?.publicId ?? newId(),
    isDemo: existing?.isDemo ?? false,
    units: input.units ?? existing?.units ?? "metric",
    updatedAt: new Date().toISOString(),
  };
  writeJSON(KEYS.athlete, athlete);
  // Profile changes (age, size, gear, game date) must re-shape today's session.
  const today = todayISO();
  const list = listWorkouts().filter((row) => row.date !== today);
  writeJSON(KEYS.workouts, list);
  generateFor(athlete, today);
  refresh();
  return athlete;
}

export function saveCheckin(input: CheckinInput): StoredCheckin {
  const athlete = getAthlete();
  if (!athlete) throw new Error("Create your athlete profile first.");
  const readiness = computeReadiness(input, recentHardLoad(listWorkouts()));
  const checkin: StoredCheckin = { ...input, date: todayISO(), readiness };
  const list = listCheckins().filter((row) => row.date !== checkin.date);
  list.push(checkin);
  writeJSON(KEYS.checkins, list);
  // Readiness changed, so today's prescription must be rebuilt around it.
  regenerateToday(athlete);
  return checkin;
}

export function completeWorkout(id: number, rpe: number, feedback: string): void {
  const list = listWorkouts().map((row) =>
    row.id === id
      ? {
          ...row,
          status: "completed" as const,
          rpe,
          feedback: feedback || null,
          completedAt: new Date().toISOString(),
        }
      : row,
  );
  writeJSON(KEYS.workouts, list);
  refresh();
}

export function skipWorkout(id: number, feedback: string): void {
  const list = listWorkouts().map((row) =>
    row.id === id
      ? {
          ...row,
          status: "skipped" as const,
          feedback: feedback || "Skipped — recovery chosen.",
        }
      : row,
  );
  writeJSON(KEYS.workouts, list);
  refresh();
}

export function clearAthlete(): void {
  removeKey(KEYS.athlete);
  removeKey(KEYS.checkins);
  removeKey(KEYS.workouts);
  refresh();
}

/* -------------------------------------------------------------- demo data */

export function createDemoAthlete(): StoredAthlete {
  const today = todayISO();
  const athlete: StoredAthlete = {
    id: 1,
    publicId: `demo-${newId()}`,
    name: "Jordan Reyes",
    age: 22,
    heightCm: 188,
    weightKg: 82,
    units: "metric",
    position: "guard",
    experience: "intermediate",
    goal: "vertical",
    daysPerWeek: 4,
    minutes: 55,
    gameDate: addDays(today, 4),
    equipment: ["bodyweight", "dumbbells", "bands", "medicine-ball", "box", "ball", "hoop", "court"],
    injuries: [],
    notes: "Playing in a rec league Thursday nights. Want to dunk by the end of the season.",
    isDemo: true,
    updatedAt: new Date().toISOString(),
  };
  writeJSON(KEYS.athlete, athlete);

  const history: {
    offset: number;
    sleep: number;
    energy: number;
    soreness: number;
    stress: number;
    hydration: number;
    feeling: CheckinInput["feeling"];
    status: "completed" | "skipped";
    rpe: number;
    feedback: string;
  }[] = [
    { offset: -6, sleep: 7.5, energy: 4, soreness: 2, stress: 2, hydration: 4, feeling: "good", status: "completed", rpe: 7, feedback: "Legs felt strong through the jumps." },
    { offset: -5, sleep: 6.5, energy: 3, soreness: 3, stress: 3, hydration: 3, feeling: "okay", status: "completed", rpe: 8, feedback: "Conditioning block was brutal but finished it." },
    { offset: -4, sleep: 8, energy: 5, soreness: 1, stress: 1, hydration: 5, feeling: "fresh", status: "completed", rpe: 6, feedback: "Best shooting session in weeks." },
    { offset: -3, sleep: 5.5, energy: 2, soreness: 4, stress: 4, hydration: 2, feeling: "tired", status: "skipped", rpe: 0, feedback: "Work ran late — chose sleep." },
    { offset: -2, sleep: 7, energy: 4, soreness: 2, stress: 2, hydration: 4, feeling: "good", status: "completed", rpe: 8, feedback: "Strong day. Added extra rim touches." },
    { offset: -1, sleep: 7.5, energy: 4, soreness: 2, stress: 2, hydration: 4, feeling: "good", status: "completed", rpe: 7, feedback: "Short and sharp, perfect before the run." },
  ];

  const checkins: StoredCheckin[] = [];
  const workouts: StoredWorkout[] = [];
  let id = 1;

  for (const day of history) {
    const date = addDays(today, day.offset);
    const input: CheckinInput = {
      sleepHours: day.sleep,
      energy: day.energy,
      soreness: day.soreness,
      stress: day.stress,
      hydration: day.hydration,
      feeling: day.feeling,
      soreAreas: [],
    };
    const readiness = computeReadiness(input, day.offset === -2 ? 2 : 0);
    checkins.push({ ...input, date, readiness });
    const plan = buildWorkout({
      profile: athlete,
      checkin: input,
      readiness,
      date,
      days: daysToGame(athlete, date),
    });
    workouts.push({
      id: id++,
      date,
      title: plan.title,
      focus: plan.focus,
      phase: plan.phase,
      intensity: plan.intensity,
      durationMin: plan.durationMin,
      loadScore: plan.loadScore,
      readinessScore: plan.readinessScore,
      plan,
      status: day.status,
      rpe: day.rpe || null,
      feedback: day.feedback,
      completedAt: day.status === "completed" ? `${date}T18:00:00.000Z` : null,
    });
  }

  const todayInput: CheckinInput = {
    sleepHours: 7.5,
    energy: 4,
    soreness: 2,
    stress: 2,
    hydration: 4,
    feeling: "good",
    soreAreas: ["Calves"],
  };
  checkins.push({ ...todayInput, date: today, readiness: computeReadiness(todayInput) });
  const todayPlan = buildWorkout({
    profile: athlete,
    checkin: todayInput,
    readiness: computeReadiness(todayInput),
    date: today,
    days: daysToGame(athlete, today),
  });
  workouts.push({
    id: id++,
    date: today,
    title: todayPlan.title,
    focus: todayPlan.focus,
    phase: todayPlan.phase,
    intensity: todayPlan.intensity,
    durationMin: todayPlan.durationMin,
    loadScore: todayPlan.loadScore,
    readinessScore: todayPlan.readinessScore,
    plan: todayPlan,
    status: "planned",
    rpe: null,
    feedback: null,
    completedAt: null,
  });

  writeJSON(KEYS.checkins, checkins);
  writeJSON(KEYS.workouts, workouts);
  refresh();
  return athlete;
}

/* ------------------------------------------------------- export / import */

export function exportData(): string {
  return JSON.stringify(
    {
      app: "courtready",
      version: VERSION,
      exportedAt: new Date().toISOString(),
      athlete: getAthlete(),
      checkins: listCheckins(),
      workouts: listWorkouts(),
    },
    null,
    2,
  );
}

export function importData(json: string): { ok: boolean; message: string } {
  try {
    const data = JSON.parse(json) as {
      athlete?: StoredAthlete | null;
      checkins?: StoredCheckin[];
      workouts?: StoredWorkout[];
    };
    if (!data || typeof data !== "object") {
      return { ok: false, message: "That file isn't valid CourtReady data." };
    }
    const athlete = data.athlete ?? null;
    const checkins = Array.isArray(data.checkins) ? data.checkins : [];
    const workouts = Array.isArray(data.workouts) ? data.workouts : [];
    if (
      athlete &&
      (typeof athlete.age !== "number" ||
        typeof athlete.heightCm !== "number" ||
        typeof athlete.weightKg !== "number")
    ) {
      return { ok: false, message: "The athlete profile in that file looks incomplete." };
    }
    writeJSON(KEYS.athlete, athlete);
    writeJSON(KEYS.checkins, checkins);
    writeJSON(KEYS.workouts, workouts);
    if (athlete) ensureTodayWorkout(athlete);
    refresh();
    return { ok: true, message: "Data imported. Your dashboard is up to date." };
  } catch {
    return {
      ok: false,
      message: "Couldn't read that file. Export a backup first, then import it.",
    };
  }
}

/* ------------------------------------------------------------ react hook */

const EMPTY: StoreSnapshot = { athlete: null, checkins: [], workouts: [] };

let snapshot: StoreSnapshot | null = null;
const listeners = new Set<() => void>();

function loadSnapshot(): StoreSnapshot {
  if (typeof window === "undefined") return EMPTY;
  if (!snapshot) {
    snapshot = {
      athlete: getAthlete(),
      checkins: listCheckins(),
      workouts: listWorkouts(),
    };
  }
  return snapshot;
}

function refresh(): void {
  snapshot = null;
  loadSnapshot();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(NS)) refresh();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStore(): StoreSnapshot {
  // During prerender and hydration the server snapshot (empty) is used, so the
  // first client render always matches the server HTML. If localStorage holds
  // an athlete, the store re-renders with it immediately after hydration.
  return useSyncExternalStore(subscribe, loadSnapshot, () => EMPTY);
}
