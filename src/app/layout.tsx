import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { getAthleteRow } from "@/lib/athlete";
import "./globals.css";

export const metadata: Metadata = {
  title: "CourtReady — Peak fitness for game day",
  description:
    "Tell CourtReady your age, size, position, goal and how you feel today. Get the best basketball workout for today, periodized to peak on game day.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  let athleteName: string | null = null;
  try {
    const athlete = await getAthleteRow();
    athleteName = athlete?.name ?? null;
  } catch {
    athleteName = null;
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-ink text-cream antialiased">
        <SiteHeader athleteName={athleteName} />
        {children}
        <footer className="mt-16 border-t border-line-soft bg-ink-2/60">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-[0.75rem] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p>
              <span className="font-semibold uppercase tracking-[0.18em] text-sand">CourtReady</span> · Training
              guidance built for basketball players.
            </p>
            <p className="max-w-xl">
              Educational programming, not medical advice. Sharp pain, dizziness or illness? Stop, and check with a
              qualified professional before your next session.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
