"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { jobsApi, applicationsApi } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, MapPin, Clock, Briefcase, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { JobPosting } from "@/types";

export function JobFeed() {
  const qc = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [days, setDays] = useState(7);
  const [search, setSearch] = useState({ keyword: "", location: "", days: 7 });
  const [applying, setApplying] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["jobs", search],
    queryFn: () =>
      jobsApi
        .list({
          keyword: search.keyword || undefined,
          location: search.location || undefined,
          days: search.days,
          size: 100,
        })
        .then((r) => r.data),
  });

  async function handleApply(job: JobPosting) {
    setApplying(job.id);
    try {
      await applicationsApi.create({
        company_id: job.company_id,
        job_title: job.title,
        job_url: job.url,
        stage: "APPLIED",
        applied_at: new Date().toISOString(),
      });
      qc.invalidateQueries({ queryKey: ["applications"] });
      toast.success(`Saved "${job.title}" to applications`);
    } catch {
      toast.error("Failed to save application");
    } finally {
      setApplying(null);
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Job Feed</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time openings from H1B sponsor companies
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          className="w-64"
          placeholder="Keyword (e.g. Software Engineer)"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setSearch({ keyword, location, days })}
        />
        <Input
          className="w-44"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setSearch({ keyword, location, days })}
        />
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={1}>Past 24h</option>
          <option value={3}>Past 3 days</option>
          <option value={7}>Past 7 days</option>
          <option value={14}>Past 2 weeks</option>
          <option value={30}>Past 30 days</option>
        </select>
        <Button onClick={() => setSearch({ keyword, location, days })}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl border bg-card animate-pulse" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Briefcase className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No jobs found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Go to <strong>Companies</strong>, import your Excel file, then click{" "}
            <strong>Scrape All</strong> to discover openings.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {data.total} job{data.total !== 1 ? "s" : ""} found
          </p>
          {data.items.map((job) => (
            <div
              key={job.id}
              className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{job.title}</span>
                  {job.is_new && (
                    <Badge className="text-[10px] px-1.5 py-0">NEW</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 flex-wrap">
                  <span className="text-sm font-medium text-primary">
                    {job.company?.name ?? "Unknown"}
                  </span>
                  {job.location && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(job.scraped_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  View <ExternalLink className="h-3 w-3" />
                </a>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={applying === job.id}
                  onClick={() => handleApply(job)}
                >
                  {applying === job.id ? "Saving…" : "+ Applied"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
