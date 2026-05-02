"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";

type WeightPoint = {
  date: string;
  kg: number | null;
};

type CompliancePoint = {
  date: string;
  score: number;
};

type StrengthPoint = {
  date: string;
  kg: number;
};

export function TrendBoard({
  weightSeries,
  complianceSeries,
  benchSeries = [],
}: {
  weightSeries: WeightPoint[];
  complianceSeries: CompliancePoint[];
  benchSeries?: StrengthPoint[];
}) {
  const weightFormatted = weightSeries.map((entry) => ({
    ...entry,
    label: entry.date.slice(5),
  }));

  const complianceFormatted = complianceSeries.map((entry) => ({
    ...entry,
    label: entry.date.slice(5),
  }));

  const benchFormatted = benchSeries.map((entry) => ({
    ...entry,
    label: entry.date.slice(5),
  }));

  const hasCompliance = complianceFormatted.some((row) => row.score > 0);
  const hasWeights = weightFormatted.some(
    (row) => typeof row.kg === "number" && !Number.isNaN(Number(row.kg)),
  );

  const hasBench = benchFormatted.some((row) => row.kg > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-3xl border border-neutral-900 bg-neutral-950 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-neutral-400">
              Mass trend
            </p>
            <h3 className="text-xl font-semibold text-neutral-50">Bodyweight</h3>
          </div>
        </div>
        {!hasWeights ? (
          <p className="text-sm text-neutral-500">
            Log morning weigh-ins inside Today to unlock the smoothed drift line.
          </p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightFormatted}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="label" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0a0a0a", borderRadius: 12 }}
                />
                <Legend />
                <Line
                  connectNulls
                  type="monotone"
                  dataKey="kg"
                  stroke="#e5e5e5"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-neutral-900 bg-neutral-950 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-neutral-400">
              Discipline streak
            </p>
            <h3 className="text-xl font-semibold text-neutral-50">
              Daily adherence
            </h3>
          </div>
        </div>

        {!hasCompliance ? (
          <p className="text-sm text-neutral-500">
            Log meals across a few days—compliance spikes will animate here automatically.
          </p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={complianceFormatted}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="label" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0a0a0a", borderRadius: 12 }}
                />
                <Bar dataKey="score" fill="#d6d6d6" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-neutral-900 bg-neutral-950 p-5 lg:col-span-2">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-neutral-400">
              Strength KPI
            </p>
            <h3 className="text-xl font-semibold text-neutral-50">
              Bench press top set load
            </h3>
            <p className="text-sm text-neutral-500">
              Uses the hardest working set per session (proxy for progression).
            </p>
          </div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-600">
            +2–4% weekly / +rep rule
          </p>
        </div>

        {!hasBench ? (
          <p className="text-sm text-neutral-500">
            Punch in Monday push sessions—the bench trace will sharpen within a lift or two.
          </p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={benchFormatted}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="label" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0a0a0a", borderRadius: 12 }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="kg"
                  stroke="#a3a3a3"
                  strokeWidth={3}
                  dot={{ r: 3, strokeWidth: 0, fill: "#fafafa" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
