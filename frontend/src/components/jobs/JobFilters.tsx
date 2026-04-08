"use client";

import { useCompanies } from "@/hooks/useCompanies";
import { useQueryClient } from "@tanstack/react-query";
import { jobsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export function JobFilters() {
  const { data: companies } = useCompanies({ size: 100 });
  const qc = useQueryClient();
  const [scraping, setScraping] = useState(false);

  async function triggerScrape() {
    setScraping(true);
    try {
      await jobsApi.triggerScrape();
      toast.success("Scrape job queued — check back in a few minutes");
      setTimeout(() => qc.invalidateQueries({ queryKey: ["jobs"] }), 5000);
    } catch {
      toast.error("Failed to trigger scrape");
    } finally {
      setScraping(false);
    }
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        {companies?.total ?? 0} companies being tracked
      </p>
      <Button variant="outline" onClick={triggerScrape} disabled={scraping}>
        <RefreshCw className={`mr-2 h-4 w-4 ${scraping ? "animate-spin" : ""}`} />
        {scraping ? "Scraping..." : "Scrape Now"}
      </Button>
    </div>
  );
}
