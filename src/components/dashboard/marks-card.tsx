"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/primitives";
import { formatPercent } from "@/lib/format";
import { PortfolioChart } from "./portfolio-chart";

const PERIODS = [
  { key: "daily", label: "1D", days: 1 },
  { key: "weekly", label: "1W", days: 7 },
  { key: "monthly", label: "1M", days: 30 },
  { key: "yearly", label: "1Y", days: 365 },
  { key: "allTime", label: "All", days: null },
] as const;

type PeriodKey = (typeof PERIODS)[number]["key"];

export function MarksCard({
  snapshots,
  changes,
  lastMarkedAt,
  scheduleNote,
}: {
  snapshots: { date: Date | string; value: number | null; freshness: string }[];
  changes: Record<PeriodKey, number | null>;
  lastMarkedAt?: Date | string | null;
  scheduleNote?: string;
}) {
  const [period, setPeriod] = useState<PeriodKey>("monthly");
  const selected = PERIODS.find((item) => item.key === period) ?? PERIODS[2];
  const filtered = useMemo(() => {
    if (!selected.days) return snapshots;
    const cutoff = Date.now() - selected.days * 24 * 60 * 60 * 1000;
    const inRange = snapshots.filter((item) => new Date(item.date).getTime() >= cutoff);
    const prior = [...snapshots].reverse().find((item) => new Date(item.date).getTime() < cutoff);
    return prior ? [prior, ...inRange] : inRange;
  }, [snapshots, selected.days]);
  const direction =
    changes[period] === null || changes[period] === undefined
      ? undefined
      : changes[period]! > 0
        ? "up"
        : changes[period]! < 0
          ? "down"
          : "flat";

  return (
    <Card className="mt-4">
      <div className="flex items-end justify-between gap-3">
        <h2 className="display text-2xl">Value</h2>
        <p
          className={
            direction === "up"
              ? "text-up tabular text-sm"
              : direction === "down"
                ? "text-down tabular text-sm"
                : "text-muted tabular text-sm"
          }
        >
          {changes[period] === null || changes[period] === undefined
            ? "—"
            : formatPercent(changes[period])}
        </p>
      </div>
      <PortfolioChart snapshots={filtered} />
      <div className="bg-bg-muted mt-4 flex rounded-full p-1">
        {PERIODS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setPeriod(item.key)}
            className={
              item.key === period
                ? "bg-bg-elevated text-ink min-h-10 flex-1 rounded-full text-sm shadow-sm"
                : "text-muted min-h-10 flex-1 rounded-full text-sm"
            }
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="text-muted mt-3 text-xs leading-5">
        {scheduleNote ??
          "Marks refresh after midnight Pacific: completed sales are pulled again. Missing comps stay insufficient."}
        {lastMarkedAt
          ? ` Last mark ${new Date(lastMarkedAt).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })} PT.`
          : " No nightly mark yet."}
      </p>
    </Card>
  );
}
