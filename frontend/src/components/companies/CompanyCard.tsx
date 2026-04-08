"use client";

import type { Company } from "@/types";
import { formatDate } from "@/lib/utils";
import { Globe, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { scraperApi } from "@/lib/api";
import { toast } from "sonner";
import Image from "next/image";

interface Props {
  company: Company;
}

export function CompanyCard({ company }: Props) {
  const qc = useQueryClient();
  const scrape = useMutation({
    mutationFn: () => scraperApi.trigger(company.id),
    onSuccess: () => {
      toast.success(`Scraping ${company.name}…`);
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-center gap-3">
        {company.logo_url ? (
          <Image
            src={company.logo_url}
            alt={company.name}
            width={36}
            height={36}
            className="rounded-md"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
            {company.name[0]}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold">{company.name}</p>
          {company.industry && (
            <p className="truncate text-xs text-muted-foreground">{company.industry}</p>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {company.last_scraped_at
            ? `Scraped ${formatDate(company.last_scraped_at)}`
            : "Never scraped"}
        </div>
        <div className="flex gap-1">
          {company.website && (
            <a href={company.website} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Globe className="h-3.5 w-3.5" />
              </Button>
            </a>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => scrape.mutate()}
            disabled={scrape.isPending}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${scrape.isPending ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
    </div>
  );
}
