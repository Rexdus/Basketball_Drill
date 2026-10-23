import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/ProfileForm";
import { Badge, Logo } from "@/components/ui";
import { getAthleteRow } from "@/lib/athlete";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Build your plan · CourtReady",
};

export default async function StartPage() {
  const existing = await getAthleteRow();
  if (existing) redirect("/");

  return (
    <main className="mx-auto max-w-6xl px-5 pb-12 pt-8 sm:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={30} />
          <span className="text-[0.75rem] uppercase tracking-[0.2em] text-muted">Back to home</span>
        </Link>
        <Badge tone="lime">Free · about 90 seconds</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr] lg:items-start">
        <div>
          <p className="eyebrow">Step 1 of 1</p>
          <h1 className="display mt-3 text-[clamp(2.2rem,5vw,3.2rem)]">
            Build your athlete file.
          </h1>
          <p className="mt-3 max-w-2xl text-[0.92rem] leading-relaxed text-sand">
            These details size every session: age and body mass cap impact, position shifts the emphasis, equipment
            filters the drill pool, and your game date drives the taper. You can change anything later.
          </p>
          <div className="mt-7">
            <ProfileForm mode="create" />
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="panel p-5">
            <p className="eyebrow">What you get</p>
            <ul className="mt-3 space-y-3">
              {[
                ["Today's session", "Full warm-up, main blocks, cool-down, cues, sets, loads and rest."],
                ["Readiness scoring", "Sleep, energy, soreness, stress and hydration become one number."],
                ["Game-day taper", "Set a game date and the week builds backwards from tip-off."],
                ["Honest equipment", "No barbell prescriptions if you only have a ball and a park hoop."],
                ["Injury filters", "Flag a joint and loading drills for it disappear automatically."],
              ].map(([title, body]) => (
                <li key={title}>
                  <p className="text-[0.84rem] font-semibold text-cream">{title}</p>
                  <p className="mt-0.5 text-[0.76rem] leading-snug text-muted">{body}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel court-grid p-5">
            <p className="eyebrow">Coach&apos;s principle</p>
            <p className="mt-2 text-[0.88rem] leading-relaxed text-sand">
              “The best basketball workout isn&apos;t the hardest one — it&apos;s the one that leaves you better for
              the next game. We chase repeatable quality, not one heroic session.”
            </p>
            <p className="mt-3 text-[0.7rem] uppercase tracking-[0.16em] text-muted">CourtReady programming team</p>
          </section>

          <p className="px-1 text-[0.72rem] leading-snug text-muted">
            CourtReady stores your profile in this app to personalise sessions. It is training guidance, not medical
            advice.
          </p>
        </aside>
      </div>
    </main>
  );
}
