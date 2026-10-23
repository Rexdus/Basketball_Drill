import type { ReactNode } from "react";
import type { Intensity } from "@/lib/types";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "flame" | "lime" | "warn" | "outline";
}) {
  const tones: Record<string, string> = {
    neutral: "border-line bg-white/[0.04] text-sand",
    flame: "border-flame/40 bg-flame/12 text-flame-2",
    lime: "border-lime/35 bg-lime/10 text-lime",
    warn: "border-amber-400/35 bg-amber-400/10 text-amber-200",
    outline: "border-line text-muted",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.11em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function IntensityBadge({ intensity }: { intensity: Intensity }) {
  const map: Record<Intensity, { label: string; tone: "neutral" | "flame" | "lime" | "warn" }> = {
    restore: { label: "Restore", tone: "neutral" },
    maintain: { label: "Maintain", tone: "lime" },
    build: { label: "Build", tone: "flame" },
    peak: { label: "Peak", tone: "warn" },
  };
  const item = map[intensity];
  return <Badge tone={item.tone}>{item.label}</Badge>;
}

export function ReadinessRing({
  score,
  size = 108,
  caption,
}: {
  score: number;
  size?: number;
  caption?: string;
}) {
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * circumference;
  const color = pct >= 70 ? "#c9f26b" : pct >= 50 ? "#ffb545" : "#ff5a1f";
  return (
    <div className="flex items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#242820" strokeWidth={7} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold leading-none">{score}</span>
          <span className="mt-0.5 text-[0.6rem] uppercase tracking-[0.16em] text-muted">/ 100</span>
        </div>
      </div>
      {caption ? (
        <div>
          <p className="eyebrow">Readiness</p>
          <p className="mt-1 text-sm font-semibold text-cream">{caption}</p>
        </div>
      ) : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="panel-flat px-4 py-3.5">
      <p className="eyebrow">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold tracking-tight ${accent ? "text-flame-2" : "text-cream"}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-[0.72rem] leading-snug text-muted">{hint}</p> : null}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  action,
  description,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  description?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="mt-2 text-xl font-bold tracking-tight text-cream sm:text-2xl">{title}</h2>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function LoadChart({
  data,
}: {
  data: { label: string; value: number; completed?: boolean; today?: boolean }[];
}) {
  const max = Math.max(60, ...data.map((d) => d.value));
  return (
    <div className="flex h-32 items-end gap-1.5">
      {data.map((point, index) => (
        <div key={`${point.label}-${index}`} className="group flex flex-1 flex-col items-center gap-1.5">
          <div className="relative flex w-full flex-1 items-end">
            <div
              className={`w-full rounded-t-[4px] transition-colors ${
                point.completed ? "bg-flame" : point.today ? "bg-lime/70" : "bg-[#2b3125]"
              }`}
              style={{ height: `${Math.max(6, (point.value / max) * 100)}%` }}
              title={`${point.label}: load ${point.value}`}
            />
          </div>
          <span className={`text-[0.6rem] uppercase tracking-wide ${point.today ? "text-lime" : "text-muted"}`}>
            {point.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TrendLine({ points, labels }: { points: number[]; labels?: string[] }) {
  const width = 320;
  const height = 84;
  const max = 100;
  const min = 20;
  const coords = points.map((value, index) => {
    const x = points.length <= 1 ? width / 2 : (index / (points.length - 1)) * width;
    const y = height - ((Math.max(min, Math.min(max, value)) - min) / (max - min)) * height;
    return { x, y, value };
  });
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c9f26b" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#c9f26b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75].map((pct) => (
          <line key={pct} x1="0" y1={(pct / 100) * height} x2={width} y2={(pct / 100) * height} stroke="#20241c" strokeWidth="1" />
        ))}
        <path d={area} fill="url(#trendFill)" />
        <path d={line} fill="none" stroke="#c9f26b" strokeWidth="2" strokeLinecap="round" />
        {coords.map((c, index) => (
          <circle key={index} cx={c.x} cy={c.y} r="2.6" fill="#080907" stroke="#c9f26b" strokeWidth="1.6" />
        ))}
      </svg>
      {labels ? (
        <div className="mt-1 flex justify-between text-[0.62rem] uppercase tracking-wide text-muted">
          <span>{labels[0]}</span>
          <span>{labels[labels.length - 1]}</span>
        </div>
      ) : null}
    </div>
  );
}

export function Meter({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex items-center justify-between text-[0.7rem] uppercase tracking-[0.12em] text-muted">
        <span>{label}</span>
        <span className="text-sand">{pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#22261d]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-flame to-flame-2"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="panel flex flex-col items-start gap-3 p-6">
      <div className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white/[0.03] text-lg">🏀</div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted">{body}</p>
      </div>
      {action}
    </div>
  );
}

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span
      className="relative grid place-items-center rounded-xl border border-flame/40 bg-flame/12"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none" stroke="#ff8a3d" strokeWidth="1.6">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3v18M5.6 5.6c3.2 3.6 3.2 9.2 0 12.8M18.4 5.6c-3.2 3.6-3.2 9.2 0 12.8" />
      </svg>
    </span>
  );
}
