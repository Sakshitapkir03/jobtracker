"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { companiesApi, scraperApi } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import {
  Building2, Upload, Play, RotateCcw, CheckCircle, XCircle,
  Loader2, Search, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Company, ScrapeStatus } from "@/types";

export function CompaniesPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [scrapeStatus, setScrapeStatus] = useState<Record<string, ScrapeStatus>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["companies", { page, search: debouncedSearch }],
    queryFn: () =>
      companiesApi.list({ page, size: 50, search: debouncedSearch || undefined }).then((r) => r.data),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => companiesApi.upload(file),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      toast.success(`Imported ${res.data.imported} companies`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail ?? "Import failed");
    },
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
      toast.success(`Scraping ${company.name}…`);
      setScrapeStatus((s) => ({ ...s, [company.id]: "running" }));
      // Poll for completion
      pollStatus(company.id);
    } catch {
      setScrapeStatus((s) => ({ ...s, [company.id]: "failed" }));
      toast.error("Failed to trigger scrape");
    }
  }

  async function scrapeAll() {
    try {
      await scraperApi.triggerAll();
      toast.success("Scraping all companies in background…");
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
        }
      } catch {
        clearInterval(interval);
      }
    }, 3000);
  }

  function statusIcon(company: Company) {
    const status = scrapeStatus[company.id];
    if (status === "running" || status === "queued") {
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />;
    }
    if (status === "done") return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
    if (status === "failed") return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    if (company.last_scraped_at) return <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />;
    return null;
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Companies</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data?.total ?? 0} companies · Import your H1B Excel list to get started
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Import Excel / CSV / PDF
          </Button>
          <Button onClick={scrapeAll}>
            <Play className="h-4 w-4 mr-2" />
            Scrape All
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

      {/* Search */}
      <div className="flex gap-2">
        <Input
          className="max-w-xs"
          placeholder="Search companies…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            clearTimeout((window as any)._searchTimer);
            (window as any)._searchTimer = setTimeout(() => {
              setDebouncedSearch(e.target.value);
              setPage(1);
            }, 300);
          }}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg border bg-card animate-pulse" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No companies yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Click <strong>Import Excel</strong> to upload your H1B sponsor list.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Company</th>
                  <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Industry</th>
                  <th className="text-left px-4 py-2.5 font-medium hidden lg:table-cell">Careers URL</th>
                  <th className="text-left px-4 py-2.5 font-medium">Last Scraped</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((company) => (
                  <tr key={company.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {statusIcon(company)}
                        <span className="font-medium truncate max-w-[200px]">{company.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {company.industry ?? "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {company.careers_url ? (
                        <a
                          href={company.careers_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 text-xs"
                        >
                          {new URL(company.careers_url).hostname}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">Auto-discover on scrape</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {company.last_scraped_at
                        ? formatDistanceToNow(new Date(company.last_scraped_at), { addSuffix: true })
                        : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => scrapeOne(company)}
                        disabled={
                          scrapeStatus[company.id] === "running" ||
                          scrapeStatus[company.id] === "queued"
                        }
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {data.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === data.pages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
