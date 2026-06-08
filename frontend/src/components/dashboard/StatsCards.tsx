"use client";

import { useApplications } from "@/hooks/useApplications";
import { useCompanies } from "@/hooks/useCompanies";
import { TrendingUp } from "lucide-react";

export function StatsCards() {
  const { data: apps } = useApplications({ size: 1000 });
  const { data: companies } = useCompanies({ size: 1000 });

  const totalApps = apps?.total ?? 0;
  const totalCompanies = companies?.total ?? 0;
  const activeApps =
    apps?.items.filter(
      (a) => !["REJECTED", "WITHDRAWN", "BOOKMARKED"].includes(a.stage)
    ).length ?? 0;
  const offers = apps?.items.filter((a) => a.stage === "OFFER").length ?? 0;
  const offerRate = totalApps > 0 ? Math.round((offers / totalApps) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Large card - Total Applications */}
      <div className="col-span-1 md:col-span-2 p-6 bg-surface-container-low border border-outline-variant rounded-xl flex flex-col justify-between min-h-[140px]">
        <div className="flex justify-between items-start">
          <span className="font-mono text-xs text-on-surface-variant tracking-widest uppercase">
            Total Applied
          </span>
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div className="mt-4">
          <div className="font-display text-5xl font-bold text-primary font-data">
            {totalApps.toLocaleString()}
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            {totalCompanies} target companies tracked
          </p>
        </div>
      </div>

      {/* Offer rate */}
      <div className="p-6 bg-surface-container-low border border-outline-variant rounded-xl">
        <span className="font-mono text-xs text-on-surface-variant tracking-widest uppercase">
          Offer Rate
        </span>
        <div className="mt-4">
          <div className="font-display text-3xl font-bold text-on-surface">{offerRate}%</div>
          <div className="w-full bg-surface-container-highest h-1 rounded-full mt-2">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${offerRate}%` }}
            />
          </div>
          <p className="text-xs text-on-surface-variant mt-2">
            {offers} offer{offers !== 1 ? "s" : ""} received
          </p>
        </div>
      </div>

      {/* Active pipeline */}
      <div className="p-6 bg-surface-container-low border border-outline-variant rounded-xl">
        <span className="font-mono text-xs text-on-surface-variant tracking-widest uppercase">
          Active Pipeline
        </span>
        <div className="mt-4">
          <div className="font-display text-3xl font-bold text-tertiary font-data">{activeApps}</div>
          <p className="text-sm text-on-surface-variant mt-1">In progress</p>
        </div>
      </div>
    </div>
  );
}
