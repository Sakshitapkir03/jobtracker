"use client";

import { useApplications } from "@/hooks/useApplications";
import { STAGE_LABELS, STAGE_COLORS } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ApplicationStage } from "@/types";

const STAGES: ApplicationStage[] = [
  "BOOKMARKED", "APPLIED", "PHONE_SCREEN", "TECHNICAL", "ONSITE", "OFFER",
];

const BAR_COLORS: Record<string, string> = {
  BOOKMARKED: "#94a3b8",
  APPLIED: "#3b82f6",
  PHONE_SCREEN: "#eab308",
  TECHNICAL: "#a855f7",
  ONSITE: "#f97316",
  OFFER: "#22c55e",
};

export function ApplicationPipeline() {
  const { data } = useApplications({ size: 1000 });

  const chartData = STAGES.map((stage) => ({
    stage: STAGE_LABELS[stage],
    count: data?.items.filter((a) => a.stage === stage).length ?? 0,
    key: stage,
  }));

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="mb-4 font-semibold">Application Pipeline</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barSize={32}>
          <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.key} fill={BAR_COLORS[entry.key]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
