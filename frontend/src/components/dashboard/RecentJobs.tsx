"use client";

import { useQuery } from "@tanstack/react-query";
import { jobsApi } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { ExternalLink, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function RecentJobs() {
  const { data } = useQuery({
    queryKey: ["jobs", { is_new: true, size: 8 }],
    queryFn: () => jobsApi.list({ is_new: true, size: 8 }).then((r) => r.data),
  });

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">New Openings</h2>
      </div>
      {!data?.items.length ? (
        <p className="text-sm text-muted-foreground">No new jobs found yet. Trigger a scrape.</p>
      ) : (
        <div className="divide-y">
          {data.items.map((job) => (
            <div key={job.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{job.title}</p>
                <p className="text-sm text-muted-foreground">
                  {job.company?.name} · {job.location ?? "Remote"} · {timeAgo(job.scraped_at)}
                </p>
              </div>
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-4 flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
