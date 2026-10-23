import type { Units } from "./types";

export const CM_PER_INCH = 2.54;
export const LB_PER_KG = 2.2046226218;

export function cmToInches(cm: number): number {
  return cm / CM_PER_INCH;
}

export function inchesToCm(inches: number): number {
  return Math.round(inches * CM_PER_INCH);
}

export function cmToFtIn(cm: number): { ft: number; inch: number } {
  const totalInches = cm / CM_PER_INCH;
  const ft = Math.floor(totalInches / 12);
  const inch = Math.round((totalInches - ft * 12) * 10) / 10;
  return { ft, inch };
}

export function ftInToCm(ft: number, inch: number): number {
  return Math.round((ft * 12 + inch) * CM_PER_INCH);
}

export function kgToLb(kg: number): number {
  return Math.round(kg * LB_PER_KG * 10) / 10;
}

export function lbToKg(lb: number): number {
  return Math.round((lb / LB_PER_KG) * 10) / 10;
}

export function formatHeight(heightCm: number, units: Units = "metric"): string {
  if (units === "imperial") {
    const { ft, inch } = cmToFtIn(heightCm);
    return `${ft}'${inch}"`;
  }
  return `${heightCm} cm`;
}

export function formatWeight(weightKg: number, units: Units = "metric"): string {
  return units === "imperial" ? `${kgToLb(weightKg)} lb` : `${weightKg} kg`;
}

export const UNITS_LABELS: Record<Units, string> = {
  metric: "Metric · cm / kg",
  imperial: "Imperial · ft/in / lb",
};
