const test = require("node:test");
const assert = require("node:assert/strict");
const { parseBackup, runStorageTransaction } = require("../.test-build/backup.js");
const { buildWorkout } = require("../.test-build/engine.js");

function backup(overrides = {}) {
  return JSON.stringify({
    app: "courtready",
    version: 1,
    exportedAt: "2026-06-01T12:00:00.000Z",
    athlete: null,
    checkins: [],
    workouts: [],
    ...overrides,
  });
}

test("accepts a supported empty CourtReady backup", () => {
  const result = parseBackup(backup());
  assert.equal(result.ok, true);
  assert.deepEqual(result.data, { athlete: null, checkins: [], workouts: [], activities: [] });
});

test("accepts a complete profile, check-in, and generated workout backup", () => {
  const athlete = {
    id: 1,
    publicId: "athlete-1",
    name: "Test Athlete",
    age: 22,
    heightCm: 185,
    weightKg: 80,
    units: "metric",
    position: "guard",
    experience: "intermediate",
    goal: "balanced",
    daysPerWeek: 3,
    minutes: 50,
    gameDate: null,
    equipment: ["bodyweight", "ball", "court"],
    injuries: [],
    recurringBasketballDays: { practiceDays: [1, 3], gameDays: [5] },
    notes: null,
    updatedAt: "2026-06-01T12:00:00.000Z",
  };
  const checkin = {
    date: "2026-06-03",
    sleepHours: 8,
    energy: 4,
    soreness: 2,
    stress: 2,
    hydration: 4,
    feeling: "good",
    soreAreas: [],
    readiness: 80,
  };
  const plan = buildWorkout({
    profile: athlete,
    checkin,
    readiness: 80,
    date: checkin.date,
    days: null,
  });
  const workout = {
    id: 1,
    date: checkin.date,
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
  const activity = {
    id: "activity-1",
    date: checkin.date,
    type: "outdoor-bike",
    durationMin: 75,
    rpe: 8,
    distanceKm: 18.2,
    notes: "Steady ride",
    createdAt: "2026-06-03T21:00:00.000Z",
  };
  const parsed = parseBackup(backup({ athlete, checkins: [checkin], workouts: [workout], activities: [activity] }));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.activities.length, 1);
});

test("rejects unsupported versions and malformed check-ins", () => {
  assert.equal(parseBackup(backup({ version: 99 })).ok, false);
  assert.equal(parseBackup(backup({ checkins: [{ date: "2026-06-01", readiness: 80 }] })).ok, false);
  assert.equal(parseBackup(backup({ activities: [{ type: "game", date: "not-a-date" }] })).ok, false);
});

test("rejects oversized backups", () => {
  assert.equal(parseBackup(" ".repeat(4_000_001)).ok, false);
});

test("rolls back earlier writes when a storage transaction fails mid-write", () => {
  const values = new Map([
    ["athlete", "old-athlete"],
    ["checkins", "old-checkins"],
    ["workouts", "old-workouts"],
  ]);
  let writes = 0;
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      writes += 1;
      if (writes === 2) throw new Error("Quota exceeded");
      values.set(key, value);
    },
    removeItem: (key) => values.delete(key),
  };
  const success = runStorageTransaction(storage, ["athlete", "checkins", "workouts"], () => {
    storage.setItem("athlete", "new-athlete");
    storage.setItem("checkins", "new-checkins");
    storage.setItem("workouts", "new-workouts");
  });
  assert.equal(success, false);
  assert.equal(values.get("athlete"), "old-athlete");
  assert.equal(values.get("checkins"), "old-checkins");
  assert.equal(values.get("workouts"), "old-workouts");
});
