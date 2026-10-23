// Health endpoint for uptime checks and local smoke tests.
//
// The route is prerendered at build time in both build modes:
// - Server build (default): it verifies the PostgreSQL connection and bakes
//   the result in, so /api/health reports database reachability.
// - Static export (STATIC_EXPORT=true, used for GitHub Pages): there is no
//   database and no server, so it bakes a plain static success response.
export const dynamic = "force-static";

export async function GET() {
  if (process.env.STATIC_EXPORT === "true") {
    return Response.json({ ok: true, mode: "static" });
  }

  try {
    const { db } = await import("@/db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, mode: "server", database: true });
  } catch {
    return Response.json({ ok: false, mode: "server", database: false }, { status: 500 });
  }
}
