import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// The database is only used by the server build (the /api/health check).
// The static export for GitHub Pages never imports this module, but we still
// avoid throwing at import time so a missing DATABASE_URL can never break a
// build — it only fails if a query is actually attempted.
const databaseUrl = process.env.DATABASE_URL ?? "";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
