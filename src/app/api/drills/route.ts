import { DRILLS } from "@/lib/exercises";

// Fully static JSON dump of the drill library. Works in both the server build
// and the static export used for GitHub Pages.
export const dynamic = "force-static";

export async function GET() {
  const counts = DRILLS.reduce<Record<string, number>>((acc, drill) => {
    acc[drill.category] = (acc[drill.category] ?? 0) + 1;
    return acc;
  }, {});

  return Response.json({
    count: DRILLS.length,
    categories: counts,
    drills: DRILLS,
  });
}
