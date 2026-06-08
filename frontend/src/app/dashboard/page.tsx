"use client";

import { useState, useEffect } from "react";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { ApplicationPipeline } from "@/components/dashboard/ApplicationPipeline";
import { RecentJobs } from "@/components/dashboard/RecentJobs";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { format } from "date-fns";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const [greeting, setGreeting] = useState("");
  const [today, setToday] = useState("");

  useEffect(() => {
    setGreeting(getGreeting());
    setToday(format(new Date(), "EEEE, MMMM d"));
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-on-surface">{greeting}</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">{today}</p>
      </div>

      <StatsCards />

      <div className="grid gap-5 lg:grid-cols-2">
        <ApplicationPipeline />
        <RecentJobs />
      </div>

      <ActivityFeed />
    </div>
  );
}
