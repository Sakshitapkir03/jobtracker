"use client";

import { useQuery } from "@tanstack/react-query";
import { jobsApi } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { ExternalLink, Sparkles, MapPin } from "lucide-react";

function avatarInitial(name: string) {
  return name[0]?.toUpperCase() ?? "?";
}

export function RecentJobs() {
  const { data } = useQuery({
    queryKey: ["jobs", { size: 6 }],
    queryFn: () => jobsApi.list({ size: 6 }).then((r) => r.data),
  });

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="font-display font-semibold text-on-surface">New Openings</h2>
      </div>
      {!data?.items.length ? (
        <p className="text-sm text-on-surface-variant py-8 text-center">
          No new jobs found yet. Trigger a scrape.
        </p>
      ) : (
        <div className="space-y-0.5">
          {data.items.map((job) => {
            const companyName = job.company?.name ?? "Unknown";
            const initial = avatarInitial(companyName);
            return (
              <div
                key={job.id}
                className="flex items-center gap-3 py-2.5 border-b border-outline-variant/40 last:border-0 group"
              >
                <div className="h-7 w-7 rounded-md bg-surface-container-highest border border-outline-variant flex items-center justify-center text-xs font-bold shrink-0 text-on-surface-variant">
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-on-surface truncate">{job.title}</p>
                  <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                    <span className="truncate">{companyName}</span>
                    {job.location && (
                      <>
                        <span className="shrink-0">·</span>
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{job.location}</span>
                      </>
                    )}
                  </p>
                </div>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                >
                  View <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
