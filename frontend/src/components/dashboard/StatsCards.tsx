"use client";

import { useApplications } from "@/hooks/useApplications";
import { useCompanies } from "@/hooks/useCompanies";
import { Briefcase, Building2, TrendingUp, Clock } from "lucide-react";

export function StatsCards() {
  const { data: apps } = useApplications({ size: 1000 });
  const { data: companies } = useCompanies({ size: 1000 });

  const totalApps = apps?.total ?? 0;
  const totalCompanies = companies?.total ?? 0;
  const activeApps = apps?.items.filter(
    (a) => !["REJECTED", "WITHDRAWN", "BOOKMARKED"].includes(a.stage)
  ).length ?? 0;
  const offers = apps?.items.filter((a) => a.stage === "OFFER").length ?? 0;

  const stats = [
    { label: "Total Applications", value: totalApps, icon: Briefcase, color: "text-blue-600" },
    { label: "Target Companies", value: totalCompanies, icon: Building2, color: "text-purple-600" },
    { label: "Active Pipeline", value: activeApps, icon: TrendingUp, color: "text-green-600" },
    { label: "Offers", value: offers, icon: Clock, color: "text-orange-600" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
      ))}
    </div>
  );
}
