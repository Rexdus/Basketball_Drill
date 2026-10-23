import { DRILLS } from "@/lib/exercises";
import type { Category, Equipment } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const gear = url.searchParams.get("gear");
  const maxImpact = Number(url.searchParams.get("maxImpact") ?? 3);
  const query = (url.searchParams.get("q") ?? "").toLowerCase();

  const drills = DRILLS.filter((drill) => {
    if (category && category !== "all" && drill.category !== (category as Category)) return false;
    if (gear && !drill.gear.includes(gear as Equipment)) return false;
    if (Number.isFinite(maxImpact) && drill.impact > maxImpact) return false;
    if (query && !`${drill.name} ${drill.cue}`.toLowerCase().includes(query)) return false;
    return true;
  });

  return Response.json({ count: drills.length, drills });
}
