"use client";

import { useApplications } from "@/hooks/useApplications";
import { STAGE_LABELS } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { ApplicationStage } from "@/types";

const STAGES: ApplicationStage[] = [
  "BOOKMARKED", "APPLIED", "PHONE_SCREEN", "TECHNICAL", "ONSITE", "OFFER",
];

const BAR_COLORS: Record<string, string> = {
  BOOKMARKED: "#3e495d",
  APPLIED: "#00d1ff",
  PHONE_SCREEN: "#eab308",
  TECHNICAL: "#d9d8ff",
  ONSITE: "#f97316",
  OFFER: "#22c55e",
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-high px-3 py-2 shadow-xl text-xs">
      <p className="font-medium text-on-surface">{label}</p>
      <p className="text-primary mt-0.5">
        {payload[0].value} application{payload[0].value !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

export function ApplicationPipeline() {
  const { data } = useApplications({ size: 1000 });

  const chartData = STAGES.map((stage) => ({
    stage: STAGE_LABELS[stage],
    count: data?.items.filter((a) => a.stage === stage).length ?? 0,
    key: stage,
  }));

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
      <h2 className="font-display font-semibold text-on-surface">Application Pipeline</h2>
      <p className="text-xs text-on-surface-variant mt-0.5 mb-4">Applications by stage</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barSize={28}>
          <XAxis
            dataKey="stage"
            tick={{ fontSize: 11, fill: "#bbc9cf" }}
            axisLine={{ stroke: "#3c494e" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#bbc9cf" }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(0,209,255,0.04)" }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.key} fill={BAR_COLORS[entry.key]} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
