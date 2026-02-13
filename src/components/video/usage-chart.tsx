"use client";

import { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type DayCount = { date: string; count: number };

type UsageChartProps = {
  dailyCounts: DayCount[];
};

function buildMonthData(dailyCounts: DayCount[]): DayCount[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build lookup from sparse server data
  const lookup = new Map(dailyCounts.map(({ date, count }) => [date, count]));

  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { date, count: lookup.get(date) ?? 0 };
  });
}

function formatLabel(date: string): string {
  // e.g. "2026-02-14" → "14"
  return date.split("-")[2] ?? date;
}

export function UsageChart({ dailyCounts }: UsageChartProps) {
  const data = useMemo(() => buildMonthData(dailyCounts), [dailyCounts]);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Videos created this month</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
          <XAxis
            dataKey="date"
            tickFormatter={formatLabel}
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value) => [value, "Videos"]}
            labelFormatter={(label) => {
              if (typeof label !== "string") return String(label);
              return new Date(label).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            }}
            cursor={{ fill: "hsl(var(--accent))" }}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]} fill="hsl(var(--primary))" maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
