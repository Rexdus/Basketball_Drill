import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { WorkoutPlan } from "@/lib/types";

export const athletes = pgTable(
  "athletes",
  {
    id: serial("id").primaryKey(),
    publicId: text("public_id").notNull(),
    name: text("name").notNull(),
    age: integer("age").notNull(),
    heightCm: integer("height_cm").notNull(),
    weightKg: real("weight_kg").notNull(),
    position: text("position").notNull().default("guard"),
    experience: text("experience").notNull().default("intermediate"),
    goal: text("goal").notNull().default("balanced"),
    daysPerWeek: integer("days_per_week").notNull().default(4),
    minutes: integer("minutes").notNull().default(55),
    gameDate: text("game_date"),
    equipment: jsonb("equipment").$type<string[]>().notNull().default([]),
    injuries: jsonb("injuries").$type<string[]>().notNull().default([]),
    notes: text("notes"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("athletes_public_id_idx").on(table.publicId)],
);

export const checkins = pgTable(
  "checkins",
  {
    id: serial("id").primaryKey(),
    athleteId: integer("athlete_id")
      .notNull()
      .references(() => athletes.id, { onDelete: "cascade" }),
    checkinDate: text("checkin_date").notNull(),
    sleepHours: real("sleep_hours").notNull().default(7),
    energy: integer("energy").notNull().default(3),
    soreness: integer("soreness").notNull().default(2),
    stress: integer("stress").notNull().default(2),
    hydration: integer("hydration").notNull().default(3),
    feeling: text("feeling").notNull().default("good"),
    soreAreas: jsonb("sore_areas").$type<string[]>().notNull().default([]),
    notes: text("notes"),
    readiness: integer("readiness").notNull().default(70),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("checkins_athlete_date_idx").on(table.athleteId, table.checkinDate)],
);

export const workouts = pgTable(
  "workouts",
  {
    id: serial("id").primaryKey(),
    athleteId: integer("athlete_id")
      .notNull()
      .references(() => athletes.id, { onDelete: "cascade" }),
    planDate: text("plan_date").notNull(),
    title: text("title").notNull(),
    focus: text("focus").notNull(),
    phase: text("phase").notNull(),
    intensity: text("intensity").notNull(),
    durationMin: integer("duration_min").notNull(),
    loadScore: integer("load_score").notNull().default(40),
    readinessScore: integer("readiness_score").notNull().default(70),
    plan: jsonb("plan").$type<WorkoutPlan>().notNull(),
    status: text("status").notNull().default("planned"),
    rpe: integer("rpe"),
    feedback: text("feedback"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("workouts_athlete_date_idx").on(table.athleteId, table.planDate)],
);

export type Athlete = typeof athletes.$inferSelect;
export type NewAthlete = typeof athletes.$inferInsert;
export type Checkin = typeof checkins.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
