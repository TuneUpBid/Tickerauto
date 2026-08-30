import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function emptyToNull(value: string | number | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

export function splitList(value: string | undefined | null): string[] {
  if (!value) return [];
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function eraFromYear(year: number): string {
  if (year < 1919) return "Brass / Veteran";
  if (year < 1930) return "Vintage";
  if (year < 1949) return "Pre-war / Immediate postwar";
  if (year < 1975) return "Classic";
  if (year < 1990) return "Late classic";
  if (year < 2005) return "Modern classic";
  return "Contemporary collectible";
}

export function correlationId(): string {
  return `ml_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
