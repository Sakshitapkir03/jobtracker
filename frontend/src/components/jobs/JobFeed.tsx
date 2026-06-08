"use client";

import { useState, useEffect, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { jobsApi, applicationsApi } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, MapPin, Clock, Briefcase, Search, GraduationCap, X, Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { JobPosting } from "@/types";

function descriptionPreview(html: string | null | undefined): string {
  if (!html) return "";
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 200 ? text.slice(0, 200).trimEnd() + "…" : text;
}

function avatarInitial(name: string) {
  return name[0]?.toUpperCase() ?? "?";
}

const DAY_OPTIONS = [
  { value: 1, label: "24h" },
  { value: 3, label: "3d" },
  { value: 7, label: "7d" },
  { value: 14, label: "14d" },
  { value: 30, label: "30d" },
];

function JobFeedInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlCompanyId = searchParams.get("company_id") ?? "";
  const urlCompanyName = searchParams.get("company_name") ?? "";

  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [days, setDays] = useState(7);
  const [entryLevel, setEntryLevel] = useState(false);
  const [companyId, setCompanyId] = useState(urlCompanyId);
  const [companyName, setCompanyName] = useState(urlCompanyName);
  const [committed, setCommitted] = useState({
    keyword: "",
    location: "",
    days: 7,
    entryLevel: false,
    companyId: urlCompanyId,
  });
  const [applying, setApplying] = useState<string | null>(null);
  const qc = useQueryClient();

  // Sync URL params → state when navigating here from companies page
  useEffect(() => {
    const cid = searchParams.get("company_id") ?? "";
    const cname = searchParams.get("company_name") ?? "";
    setCompanyId(cid);
    setCompanyName(cname);
    setCommitted((c) => ({ ...c, companyId: cid }));
  }, [searchParams]);

  function commit() {
    setCommitted({ keyword, location, days, entryLevel, companyId });
  }

  function clearCompanyFilter() {
    setCompanyId("");
    setCompanyName("");
    setCommitted((c) => ({ ...c, companyId: "" }));
    router.replace("/jobs");
  }

  const { data, isLoading } = useQuery({
    queryKey: ["jobs", committed],
    queryFn: () =>
      jobsApi
        .list({
          keyword: committed.keyword || undefined,
          location: committed.location || undefined,
          days: committed.days,
          entry_level: committed.entryLevel || undefined,
          company_id: committed.companyId || undefined,
          size: 100,
        })
        .then((r) => r.data),
  });

  const { data: applicationsData } = useQuery({
    queryKey: ["applications", "all-urls"],
    queryFn: () => applicationsApi.list({ size: 1000 }).then((r) => r.data),
  });

  const appliedUrls = new Set(
    applicationsData?.items.map((a) => a.job_url).filter(Boolean) ?? []
  );

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
      qc.invalidateQueries({ queryKey: ["applications", "all-urls"] });
      toast.success(`Saved "${job.title}"`);
    } catch {
      toast.error("Failed to save application");
    } finally {
      setApplying(null);
    }
  }

  const hasFilters =
    committed.keyword || committed.location || committed.days !== 7 || committed.entryLevel;

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      {/* Company filter banner — shown when navigated from companies page */}
      {companyId && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5">
          <Building2 className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm text-on-surface">
            Showing openings at{" "}
            <span className="font-semibold text-primary">{companyName || "this company"}</span>
          </span>
          <button
            onClick={clearCompanyFilter}
            className="ml-auto text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-on-surface-variant" />
            <Input
              className="pl-8 h-9 text-sm bg-surface-container border border-outline-variant focus:border-primary text-on-surface placeholder:text-on-surface-variant"
              placeholder="Job title or keyword…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commit()}
            />
            {keyword && (
              <button
                onClick={() => {
                  setKeyword("");
                  setCommitted((c) => ({ ...c, keyword: "" }));
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="relative w-36">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-on-surface-variant" />
            <Input
              className="pl-8 h-9 text-sm bg-surface-container border border-outline-variant focus:border-primary text-on-surface placeholder:text-on-surface-variant"
              placeholder="Location…"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commit()}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-on-surface-variant font-medium">Posted within:</span>
          {DAY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setDays(opt.value);
                setCommitted((c) => ({ ...c, days: opt.value }));
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                days === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-on-surface-variant hover:text-primary border-outline-variant bg-transparent"
              }`}
            >
              {opt.label}
            </button>
          ))}

          <div className="w-px h-4 bg-outline-variant mx-1" />

          <button
            onClick={() => {
              const next = !entryLevel;
              setEntryLevel(next);
              setCommitted((c) => ({ ...c, entryLevel: next }));
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              entryLevel
                ? "bg-primary/20 text-primary border-primary/30"
                : "text-on-surface-variant hover:text-primary border-outline-variant bg-transparent"
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Entry Level / New Grad
          </button>

          <Button
            size="sm"
            className="ml-auto h-7 text-xs bg-primary text-primary-foreground hover:opacity-90"
            onClick={commit}
          >
            Search
          </Button>
        </div>
      </div>

      {/* Results count */}
      {!isLoading && data && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-on-surface-variant">
            <span className="font-semibold text-on-surface">{data.total}</span>{" "}
            job{data.total !== 1 ? "s" : ""} found
            {hasFilters && " · "}
            {hasFilters && (
              <button
                onClick={() => {
                  setKeyword("");
                  setLocation("");
                  setDays(7);
                  setEntryLevel(false);
                  setCommitted({ keyword: "", location: "", days: 7, entryLevel: false, companyId });
                }}
                className="text-primary hover:underline"
              >
                clear filters
              </button>
            )}
          </p>
        </div>
      )}

      {/* Job list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl border border-outline-variant bg-surface-container-low animate-pulse"
            />
          ))}
        </div>
      ) : !data?.items.length ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-16 text-center">
          <Briefcase className="h-10 w-10 mx-auto text-on-surface-variant/30 mb-3" />
          <p className="font-medium text-on-surface">No jobs found</p>
          <p className="text-sm text-on-surface-variant mt-1 max-w-xs mx-auto">
            {companyId
              ? "This company has no scraped openings yet. Try scraping it from the Companies page."
              : "Go to Companies, import your Excel list, then click Scrape All."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.items.map((job) => {
            const preview = descriptionPreview(job.description);
            const companyName = job.company?.name ?? "Unknown";
            const initial = avatarInitial(companyName);

            return (
              <div
                key={job.id}
                className="rounded-xl border border-outline-variant bg-surface-container-low p-4 hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-surface-container-highest border border-outline-variant flex items-center justify-center text-sm font-bold shrink-0 text-on-surface-variant">
                    {initial}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-on-surface">{job.title}</span>
                          {job.is_new && (
                            <Badge className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border border-primary/20 glow-cyan rounded-full">
                              NEW
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-sm text-primary font-medium">{companyName}</span>
                          {job.location && (
                            <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                              <MapPin className="h-3 w-3" />
                              {job.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs text-on-surface-variant">
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
                          className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary transition-colors"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                        {appliedUrls.has(job.url) ? (
                          <span className="inline-flex items-center gap-1 h-7 px-3 rounded-md text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                            <CheckCircle2 className="h-3 w-3" />
                            Applied
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant={applying === job.id ? "outline" : "default"}
                            className={`h-7 text-xs px-3 ${
                              applying === job.id
                                ? "border-outline-variant text-on-surface-variant"
                                : "bg-primary text-primary-foreground hover:opacity-90"
                            }`}
                            disabled={applying === job.id}
                            onClick={() => handleApply(job)}
                          >
                            {applying === job.id ? "Saving…" : "+ Applied"}
                          </Button>
                        )}
                      </div>
                    </div>

                    {preview && (
                      <p className="mt-1.5 text-xs text-on-surface-variant leading-relaxed line-clamp-2">
                        {preview}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function JobFeed() {
  return (
    <Suspense>
      <JobFeedInner />
    </Suspense>
  );
}
