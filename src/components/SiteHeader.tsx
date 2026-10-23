"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { Logo } from "./ui";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/plan", label: "Game plan" },
  { href: "/history", label: "My log" },
  { href: "/library", label: "Drill library" },
  { href: "/profile", label: "Profile" },
];

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function SiteHeader() {
  const pathname = usePathname();
  const { athlete } = useStore();
  const athleteName = athlete?.name ?? null;

  // usePathname may include the configured basePath on static hosts; strip it
  // so active-link detection works everywhere.
  const barePath =
    BASE_PATH && pathname.startsWith(BASE_PATH) ? pathname.slice(BASE_PATH.length) || "/" : pathname;

  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-ink/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3 sm:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <Logo />
          <span className="flex flex-col leading-none">
            <span className="text-[0.95rem] font-extrabold uppercase tracking-[0.16em] text-cream">
              Court<span className="text-flame-2">Ready</span>
            </span>
            <span className="mt-1 text-[0.58rem] uppercase tracking-[0.22em] text-muted">
              Peak for tip-off
            </span>
          </span>
        </Link>

        <nav className="order-3 -mx-1 flex w-full items-center gap-1 overflow-x-auto pb-0.5 sm:order-2 sm:mx-0 sm:w-auto sm:flex-1 sm:overflow-visible">
          {LINKS.map((link) => {
            const active = link.href === "/" ? barePath === "/" : barePath.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[0.8rem] font-medium transition-colors ${
                  active
                    ? "bg-white/[0.07] text-cream"
                    : "text-muted hover:bg-white/[0.04] hover:text-sand"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="order-2 ml-auto flex items-center gap-2 sm:order-3">
          {athleteName ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-full border border-line bg-panel/80 py-1 pl-1 pr-3 text-[0.78rem] text-sand transition-colors hover:border-[#3a4033]"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-flame/20 text-[0.68rem] font-bold text-flame-2">
                {athleteName.slice(0, 1).toUpperCase()}
              </span>
              <span className="max-w-[8rem] truncate">{athleteName}</span>
            </Link>
          ) : (
            <Link href="/start" className="btn btn-primary !py-1.5 !text-[0.78rem]">
              Build my plan
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
