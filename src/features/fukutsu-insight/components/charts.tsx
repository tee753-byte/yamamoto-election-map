"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AgeGroup, TrendPoint } from "@/features/fukutsu-insight/types/statistics";
import { formatNumber } from "@/features/fukutsu-insight/utils/format";
import styles from "./insight.module.css";

const chartText = { fontSize: 12, fill: "#716a6c" };

export function PopulationTrendChart({ data }: { data: TrendPoint[] }) {
  const chartData = data.map((item) => ({ ...item, year: item.date.slice(0, 4) }));
  return (
    <figure className={styles.chart} aria-label="人口推移グラフ">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 12, right: 10, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="insight-population-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#862d39" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#862d39" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e2e0" />
          <XAxis dataKey="year" tick={chartText} axisLine={false} tickLine={false} />
          <YAxis
            domain={["dataMin - 1000", "dataMax + 500"]}
            tick={chartText}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => `${Math.round(value / 1000)}千`}
            width={42}
          />
          <Tooltip
            formatter={(value) => [`${formatNumber(Number(value))}人`, "総人口"]}
          />
          <Area
            type="monotone"
            dataKey="population"
            stroke="#862d39"
            strokeWidth={2.5}
            fill="url(#insight-population-fill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </figure>
  );
}

export function AgeCompositionChart({ data }: { data: AgeGroup[] }) {
  return (
    <figure className={styles.chart} aria-label="年代別人口構成グラフ">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e2e0" />
          <XAxis
            dataKey="label"
            tick={chartText}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tick={chartText}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => `${Math.round(value / 1000)}千`}
            width={36}
          />
          <Tooltip
            formatter={(value) => [`${formatNumber(Number(value))}人`, "人口"]}
          />
          <Bar
            dataKey="value"
            fill="#862d39"
            radius={[5, 5, 0, 0]}
            maxBarSize={38}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}

export function MultiTrendChart({ data }: { data: TrendPoint[] }) {
  const chartData = data.map((item) => ({ ...item, year: item.date.slice(0, 4) }));
  return (
    <figure
      className={`${styles.chart} ${styles.chartLarge}`}
      aria-label="人口・世帯数推移グラフ"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 12, right: 12, left: 6, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e2e0" />
          <XAxis dataKey="year" tick={chartText} axisLine={false} tickLine={false} />
          <YAxis
            tick={chartText}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => `${Math.round(value / 1000)}千`}
            width={42}
          />
          <Tooltip
            formatter={(value, name) => [
              formatNumber(Number(value)),
              name === "population" ? "人口（人）" : "世帯数",
            ]}
          />
          <Legend
            formatter={(value) => (value === "population" ? "総人口" : "総世帯数")}
          />
          <Line
            type="monotone"
            dataKey="population"
            stroke="#862d39"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="households"
            stroke="#a4661d"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
