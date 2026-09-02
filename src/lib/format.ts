import { formatMoney, type Money } from "@/domain/money";

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Insufficient verified data";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(2)}%`;
}

export function formatValueOrInsufficient(value: Money | null | undefined): string {
  return formatMoney(value, { fallback: "Insufficient verified data" });
}

export function freshnessLabel(freshness: string): string {
  switch (freshness) {
    case "CURRENT":
      return "Current verified evidence";
    case "STALE":
      return "Stale — last verified value preserved";
    case "INSUFFICIENT":
      return "Insufficient verified data";
    case "PROVIDER_UNAVAILABLE":
      return "Provider unavailable — last verified value preserved";
    default:
      return freshness;
  }
}
