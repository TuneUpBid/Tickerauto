"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function useThemeColor(variable: string, fallback: string) {
  const [color, setColor] = useState(fallback);
  useEffect(() => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    if (value) setColor(value);
  }, [variable]);
  return color;
}

export function PortfolioChart({
  snapshots,
}: {
  snapshots: { date: Date | string; value: number | null; freshness: string }[];
}) {
  const accent = useThemeColor("--accent", "#d4a15a");
  const line = useThemeColor("--line", "#3f362b");
  const muted = useThemeColor("--muted", "#b7a894");
  const elevated = useThemeColor("--bg-elevated", "#16130f");
  const ink = useThemeColor("--ink", "#f4ead8");

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
    <div className="mt-4 h-72 w-full">
      <ResponsiveContainer width="100%" height={288}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={line} />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: muted }} stroke={line} />
          <YAxis tick={{ fontSize: 12, fill: muted }} stroke={line} />
          <Tooltip
            contentStyle={{
              background: elevated,
              border: `1px solid ${line}`,
              borderRadius: 16,
              color: ink,
            }}
            labelStyle={{ color: muted }}
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
            stroke={accent}
            fill={accent}
            fillOpacity={0.15}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
