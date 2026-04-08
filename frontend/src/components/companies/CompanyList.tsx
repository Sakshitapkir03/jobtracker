"use client";

import { useState } from "react";
import { useCompanies } from "@/hooks/useCompanies";
import { CompanyCard } from "./CompanyCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function CompanyList() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useCompanies({ search, size: 50 });

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search companies..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading companies...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
          {data?.items.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground">
              No companies yet. Import a PDF or add one manually.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
