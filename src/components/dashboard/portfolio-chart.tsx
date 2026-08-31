"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function PortfolioChart({
  snapshots,
}: {
  snapshots: { date: Date | string; value: number | null; freshness: string }[];
}) {
  if (!snapshots.length) {
    return (
      <p className="text-muted mt-6 text-sm">
        No historical snapshots yet. Charts are not interpolated.
      </p>
    );
  }
  const data = snapshots.map((item) => ({
    date: new Date(item.date).toISOString().slice(0, 10),
    value: item.value,
    freshness: item.freshness,
  }));
  return (
    <div className="mt-4 h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--muted)" }} stroke="var(--line)" />
          <YAxis tick={{ fontSize: 12, fill: "var(--muted)" }} stroke="var(--line)" />
          <Tooltip
            contentStyle={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--line)",
              borderRadius: 0,
              color: "var(--ink)",
            }}
            labelStyle={{ color: "var(--muted)" }}
            formatter={(value, _name, props) => [
              value === null || value === undefined
                ? "Insufficient verified data"
                : `USD ${Number(value).toLocaleString()}`,
              props.payload.freshness === "CURRENT"
                ? "Snapshot"
                : `Snapshot (${props.payload.freshness})`,
            ]}
          />
          <Area
            type="linear"
            dataKey="value"
            connectNulls={false}
            stroke="var(--accent)"
            fill="var(--accent)"
            fillOpacity={0.15}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
