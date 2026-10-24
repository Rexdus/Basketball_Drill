const test = require("node:test");
const assert = require("node:assert/strict");
const { buildWorkout, isScheduledTrainingDay, trainingWeekdays } = require("../.test-build/engine.js");

const profile = {
  id: 1,
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
  notes: null,
};
const monday = "2026-06-01";
function dateAt(offset) {
  const date = new Date(`${monday}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

test("schedules exactly the selected number of evenly distributed days each week", () => {
  for (let daysPerWeek = 1; daysPerWeek <= 7; daysPerWeek += 1) {
    const athlete = { ...profile, daysPerWeek };
    const scheduled = Array.from({ length: 7 }, (_, day) => dateAt(day))
      .filter((date) => isScheduledTrainingDay(athlete, date));
    assert.equal(scheduled.length, daysPerWeek);
    assert.equal(trainingWeekdays(daysPerWeek).length, daysPerWeek);
  }
});

test("generates a non-loggable rest plan on unscheduled days", () => {
  const athlete = { ...profile, daysPerWeek: 3 };
  const offDay = dateAt(1); // Tuesday is off in the 3-day schedule.
  assert.equal(isScheduledTrainingDay(athlete, offDay), false);
  const plan = buildWorkout({ profile: athlete, checkin: null, readiness: 80, date: offDay, days: null });
  assert.equal(plan.isRestDay, true);
  assert.equal(plan.durationMin, 0);
  assert.equal(plan.loadScore, 0);
  assert.deepEqual(plan.blocks, []);
});

test("reserves recurring practices and games before assigning CourtReady workouts", () => {
  const athlete = {
    ...profile,
    daysPerWeek: 4,
    recurringBasketballDays: { practiceDays: [1], gameDays: [4] },
  };
  const scheduled = Array.from({ length: 7 }, (_, day) => dateAt(day))
    .filter((date) => isScheduledTrainingDay(athlete, date));
  assert.equal(scheduled.length, 4);
  assert.equal(isScheduledTrainingDay(athlete, dateAt(1)), false); // Tuesday practice.
  assert.equal(isScheduledTrainingDay(athlete, dateAt(4)), false); // Friday game.
  const practicePlan = buildWorkout({
    profile: athlete,
    checkin: null,
    readiness: 80,
    date: dateAt(1),
    days: null,
  });
  assert.equal(practicePlan.isRestDay, true);
  assert.match(practicePlan.title, /practice/i);
});

test("keeps a game-day primer even if tip-off falls on a regular off day", () => {
  const athlete = { ...profile, daysPerWeek: 3 };
  const offDay = dateAt(1);
  const plan = buildWorkout({ profile: athlete, checkin: null, readiness: 80, date: offDay, days: 0 });
  assert.equal(plan.isRestDay, undefined);
  assert.equal(plan.title, "Game day primer");
  assert.ok(plan.durationMin > 0);
  assert.equal(plan.intensity, "maintain");
});

test("does not use BMI to change impact eligibility or drill selection", () => {
  const regular = { ...profile, goal: "vertical" };
  const highBmi = { ...regular, heightCm: 160, weightKg: 140 };
  const build = (athlete) => buildWorkout({
    profile: athlete,
    checkin: null,
    readiness: 90,
    date: monday,
    days: null,
  });
  const selectedDrills = (plan) => plan.blocks.flatMap((block) => block.exercises.map((exercise) => exercise.name));
  assert.deepEqual(selectedDrills(build(highBmi)), selectedDrills(build(regular)));
});

test("limits each workout to two plyometric drill variations and one impact warm-up", () => {
  const athlete = { ...profile, goal: "vertical", equipment: ["bodyweight", "ball", "court", "box", "medicine-ball"] };
  const plan = buildWorkout({ profile: athlete, checkin: null, readiness: 90, date: monday, days: null });
  const plyo = plan.blocks.find((block) => block.id === "plyo");
  const warmup = plan.blocks.find((block) => block.id === "warmup");
  assert.ok(plyo);
  assert.ok(plyo.exercises.length <= 2);
  assert.ok(warmup.exercises.filter((exercise) => ["Pogo + snap-down primer", "Quick-feet rope rounds", "Rhythm approach jumps"].includes(exercise.name)).length <= 1);
});

test("flags youth supervision and technique-first loading", () => {
  const youth = { ...profile, age: 15, goal: "strength", experience: "advanced" };
  const plan = buildWorkout({ profile: youth, checkin: null, readiness: 85, date: monday, days: null });
  assert.ok(plan.cautions.some((caution) => /qualified adult supervision/i.test(caution)));
  const weighted = plan.blocks.flatMap((block) => block.exercises).filter((exercise) => exercise.load);
  assert.ok(weighted.every((exercise) => /RPE 6–7/i.test(exercise.load)));
});
