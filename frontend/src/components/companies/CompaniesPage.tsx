"use client";

import { useState, useRef, useEffect } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { companiesApi, scraperApi } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import {
  Building2, Upload, Play, RotateCcw, CheckCircle, XCircle,
  Loader2, Search, ExternalLink, Pencil, Briefcase, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Company, ScrapeStatus } from "@/types";
import ContactsDialog from "@/components/contacts/ContactsDialog";

function loadResume() {
  if (typeof window === "undefined") return null;
  if (sessionStorage.getItem("companies-resume") !== "1") return null;
  return {
    search: sessionStorage.getItem("companies-search") ?? "",
    role: sessionStorage.getItem("companies-role") ?? "",
    scroll: parseInt(sessionStorage.getItem("companies-scroll") ?? "0", 10),
  };
}

export function CompaniesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState(() => loadResume()?.search ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(() => loadResume()?.search ?? "");
  const [roleSearch, setRoleSearch] = useState(() => loadResume()?.role ?? "");
  const [debouncedRole, setDebouncedRole] = useState(() => loadResume()?.role ?? "");
  const [scrapeStatus, setScrapeStatus] = useState<Record<string, ScrapeStatus>>({});
  const [editingUrl, setEditingUrl] = useState<{ id: string; value: string } | null>(null);
  const [contactsCompany, setContactsCompany] = useState<Company | null>(null);
  const [isScrapingAll, setIsScrapingAll] = useState(false);

  function debounce(key: "search" | "role", value: string) {
    const timerKey = `_dt_${key}` as any;
    clearTimeout((window as any)[timerKey]);
    (window as any)[timerKey] = setTimeout(() => {
      if (key === "search") setDebouncedSearch(value);
      else setDebouncedRole(value);
    }, 300);
  }

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ["companies", { search: debouncedSearch, role: debouncedRole }],
    queryFn: ({ pageParam }) =>
      companiesApi.list({
        page: pageParam as number,
        size: 50,
        search: debouncedSearch || undefined,
        role_keyword: debouncedRole || undefined,
      }).then((r) => r.data),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any, _: any, lastPageParam: any) =>
      lastPageParam < lastPage.pages ? lastPageParam + 1 : undefined,
    staleTime: 60_000,
    refetchInterval: isScrapingAll ? 15_000 : false,
  });

  const allCompanies = data?.pages.flatMap((p: any) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  // Restore scroll position when navigating back from job feed, then clear saved state
  useEffect(() => {
    const resume = loadResume();
    if (!resume) return;
    const main = document.querySelector("main");
    if (main) main.scrollTop = resume.scroll;
    sessionStorage.removeItem("companies-resume");
    sessionStorage.removeItem("companies-scroll");
    sessionStorage.removeItem("companies-search");
    sessionStorage.removeItem("companies-role");
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => companiesApi.upload(file),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      toast.success(`Imported ${res.data.imported} companies`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Import failed"),
  });

  const updateUrlMutation = useMutation({
    mutationFn: ({ id, url }: { id: string; url: string }) =>
      companiesApi.update(id, { careers_url: url || null } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      setEditingUrl(null);
    },
    onError: () => toast.error("Failed to update URL"),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = "";
  }

  async function scrapeOne(company: Company) {
    setScrapeStatus((s) => ({ ...s, [company.id]: "queued" }));
    try {
      await scraperApi.trigger(company.id);
      setScrapeStatus((s) => ({ ...s, [company.id]: "running" }));
      pollStatus(company.id);
    } catch {
      setScrapeStatus((s) => ({ ...s, [company.id]: "failed" }));
      toast.error("Failed to trigger scrape");
    }
  }

  async function scrapeAll() {
    try {
      await scraperApi.triggerAll();
      toast.success("Scraping all companies… this may take a few minutes.");
      setIsScrapingAll(true);
      setTimeout(() => setIsScrapingAll(false), 10 * 60 * 1000);
    } catch {
      toast.error("Failed to trigger scrape");
    }
  }

  async function pollStatus(companyId: string) {
    const interval = setInterval(async () => {
      try {
        const res = await scraperApi.status(companyId);
        const status = res.data.status as ScrapeStatus;
        setScrapeStatus((s) => ({ ...s, [companyId]: status }));
        if (status === "done" || status === "failed") {
          clearInterval(interval);
          qc.invalidateQueries({ queryKey: ["companies"] });
          qc.invalidateQueries({ queryKey: ["jobs"] });
          if (status === "done") toast.success("Scrape complete");
        }
      } catch {
        clearInterval(interval);
      }
    }, 3000);
  }

  function statusIcon(company: Company) {
    const status = scrapeStatus[company.id];
    if (status === "running" || status === "queued")
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
    if (status === "done")
      return <CheckCircle className="h-3.5 w-3.5 text-green-400" />;
    if (status === "failed")
      return <XCircle className="h-3.5 w-3.5 text-error" />;
    if (company.last_scraped_at)
      return <CheckCircle className="h-3.5 w-3.5 text-on-surface-variant/40" />;
    return null;
  }

  function careersHostname(url: string) {
    try { return new URL(url).hostname.replace("www.", ""); }
    catch { return url; }
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-on-surface">Companies</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {total} companies tracked
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="border border-outline text-on-surface hover:border-primary hover:text-primary bg-transparent"
            onClick={() => fileRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Import
          </Button>
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:opacity-90"
            onClick={scrapeAll}
            disabled={isScrapingAll}
          >
            {isScrapingAll ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isScrapingAll ? "Scraping…" : "Scrape All"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv,.pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Search row */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-on-surface-variant" />
          <Input
            className="pl-8 h-9 w-56 text-sm bg-surface-container-low border border-outline-variant focus:border-primary text-on-surface placeholder:text-on-surface-variant"
            placeholder="Search companies…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); debounce("search", e.target.value); }}
          />
        </div>
        <div className="relative">
          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-on-surface-variant" />
          <Input
            className="pl-8 h-9 w-64 text-sm bg-surface-container-low border border-outline-variant focus:border-primary text-on-surface placeholder:text-on-surface-variant"
            placeholder="Filter by role (e.g. Software Engineer)…"
            value={roleSearch}
            onChange={(e) => { setRoleSearch(e.target.value); debounce("role", e.target.value); }}
          />
        </div>
        {debouncedRole && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-data">
            <Briefcase className="h-3 w-3" />
            {total} companies with "{debouncedRole}" roles
          </div>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-12 rounded-xl border border-outline-variant bg-surface-container-low animate-pulse"
            />
          ))}
        </div>
      ) : !allCompanies.length ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-16 text-center">
          <Building2 className="h-10 w-10 mx-auto text-on-surface-variant/30 mb-3" />
          <p className="font-medium text-on-surface">
            {debouncedRole ? `No companies have "${debouncedRole}" openings` : "No companies yet"}
          </p>
          <p className="text-sm text-on-surface-variant mt-1">
            {debouncedRole
              ? "Try scraping companies first, or search a different role."
              : "Click Import to upload your H1B Excel or CSV list."}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-outline-variant bg-surface-container-low overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-lowest">
                  <th className="text-left px-4 py-3 font-data text-xs text-on-surface-variant uppercase tracking-widest">
                    Company
                  </th>
                  <th className="text-left px-4 py-3 font-data text-xs text-on-surface-variant uppercase tracking-widest hidden md:table-cell">
                    Industry
                  </th>
                  <th className="text-left px-4 py-3 font-data text-xs text-on-surface-variant uppercase tracking-widest hidden lg:table-cell">
                    Careers Page
                  </th>
                  <th className="text-left px-4 py-3 font-data text-xs text-on-surface-variant uppercase tracking-widest">
                    Openings
                  </th>
                  <th className="text-left px-4 py-3 font-data text-xs text-on-surface-variant uppercase tracking-widest hidden xl:table-cell">
                    Last Scraped
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {allCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-primary/5 transition-colors group">
                    {/* Company name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-surface-container-highest rounded border border-outline-variant flex items-center justify-center text-xs font-bold text-on-surface-variant shrink-0">
                          {company.name[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {statusIcon(company)}
                          <span className="font-medium text-on-surface truncate max-w-[160px]">
                            {company.name}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Industry */}
                    <td className="px-4 py-3 text-on-surface-variant text-sm hidden md:table-cell">
                      {company.industry ?? "—"}
                    </td>

                    {/* Careers URL */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {editingUrl?.id === company.id ? (
                        <input
                          autoFocus
                          value={editingUrl.value}
                          onChange={(e) => setEditingUrl({ id: company.id, value: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              updateUrlMutation.mutate({ id: company.id, url: editingUrl.value });
                            if (e.key === "Escape") setEditingUrl(null);
                          }}
                          onBlur={() =>
                            updateUrlMutation.mutate({ id: company.id, url: editingUrl.value })
                          }
                          className="text-xs border border-outline-variant rounded-md px-2 py-1 w-52 bg-surface-container text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="https://…"
                        />
                      ) : (
                        <div
                          className="flex items-center gap-1.5 group/url cursor-pointer"
                          onClick={() =>
                            setEditingUrl({ id: company.id, value: company.careers_url ?? "" })
                          }
                        >
                          {company.careers_url ? (
                            <a
                              href={company.careers_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-primary hover:underline flex items-center gap-1 text-xs font-data"
                            >
                              {careersHostname(company.careers_url)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-on-surface-variant/40">—</span>
                          )}
                          <Pencil className="h-3 w-3 text-on-surface-variant opacity-0 group-hover/url:opacity-40 transition-opacity" />
                        </div>
                      )}
                    </td>

                    {/* Openings count */}
                    <td className="px-4 py-3">
                      {company.job_count > 0 ? (
                        <button
                          onClick={() => {
                            const main = document.querySelector("main");
                            sessionStorage.setItem("companies-resume", "1");
                            sessionStorage.setItem("companies-scroll", String(main?.scrollTop ?? 0));
                            sessionStorage.setItem("companies-search", search);
                            sessionStorage.setItem("companies-role", roleSearch);
                            router.push(
                              `/jobs?company_id=${company.id}&company_name=${encodeURIComponent(company.name)}`
                            );
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-data hover:bg-primary/20 transition-colors"
                        >
                          <Briefcase className="h-3 w-3" />
                          {company.job_count}
                        </button>
                      ) : (
                        <span className="text-xs text-on-surface-variant/40 font-data">—</span>
                      )}
                    </td>

                    {/* Last scraped */}
                    <td className="px-4 py-3 text-xs text-on-surface-variant hidden xl:table-cell">
                      {company.last_scraped_at ? (
                        formatDistanceToNow(new Date(company.last_scraped_at), { addSuffix: true })
                      ) : (
                        <span className="text-on-surface-variant/40">Never</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-on-surface-variant hover:text-on-surface"
                          onClick={() => setContactsCompany(company)}
                          title="Find Contacts"
                        >
                          <Users className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-on-surface-variant hover:text-on-surface"
                          onClick={() => scrapeOne(company)}
                          disabled={
                            scrapeStatus[company.id] === "running" ||
                            scrapeStatus[company.id] === "queued"
                          }
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-4" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-3">
              <Loader2 className="h-5 w-5 animate-spin text-on-surface-variant" />
            </div>
          )}
        </>
      )}

      {contactsCompany && (
        <ContactsDialog
          companyId={contactsCompany.id}
          companyName={contactsCompany.name}
          open={!!contactsCompany}
          onClose={() => setContactsCompany(null)}
        />
      )}
    </div>
  );
}
