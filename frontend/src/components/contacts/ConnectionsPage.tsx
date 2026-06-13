"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { contactsApi } from "@/lib/api";
import { Users, Search, Linkedin, Mail, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function ConnectionsPage() {
  const [search, setSearch] = useState("");

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts-all"],
    queryFn: () => contactsApi.listAll().then((r) => r.data),
  });

  const filtered = contacts.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.title?.toLowerCase().includes(q) ||
      c.company_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, c) => {
    const key = c.company_name ?? c.company_id;
    acc[key] = acc[key] ?? [];
    acc[key].push(c);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-on-surface">Connections</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""} across{" "}
            {Object.keys(grouped).length} compan{Object.keys(grouped).length !== 1 ? "ies" : "y"}
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-on-surface-variant" />
        <Input
          className="pl-8 h-9 w-72 text-sm bg-surface-container-low border border-outline-variant focus:border-primary text-on-surface placeholder:text-on-surface-variant"
          placeholder="Search by name, title, or company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl border border-outline-variant bg-surface-container-low animate-pulse"
            />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-16 text-center">
          <Users className="h-10 w-10 mx-auto text-on-surface-variant/30 mb-3" />
          <p className="font-medium text-on-surface">No contacts yet</p>
          <p className="text-sm text-on-surface-variant mt-1">
            Go to Companies and click the <Users className="inline h-3.5 w-3.5 mx-1" /> icon on a company to find contacts.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-12 text-center">
          <p className="text-sm text-on-surface-variant">No contacts match "{search}"</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([companyName, people]) => (
            <div key={companyName}>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-on-surface-variant" />
                <span className="text-sm font-semibold text-on-surface">{companyName}</span>
                <span className="text-xs text-on-surface-variant/60 font-data">{people.length}</span>
              </div>
              <div className="rounded-xl border border-outline-variant bg-surface-container-low overflow-hidden divide-y divide-outline-variant">
                {people.map((c) => (
                  <div key={c.id} className="flex items-center gap-4 px-4 py-3 hover:bg-primary/5 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {c.name[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">{c.name}</p>
                      {c.title && (
                        <p className="text-xs text-on-surface-variant truncate">{c.title}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {c.linkedin_url && (
                        <a
                          href={c.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-on-surface-variant hover:text-primary transition-colors"
                          title="LinkedIn"
                        >
                          <Linkedin className="h-4 w-4" />
                        </a>
                      )}
                      {c.email && (
                        <a
                          href={`mailto:${c.email}`}
                          className="text-on-surface-variant hover:text-primary transition-colors"
                          title={c.email}
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      )}
                      {c.title && (
                        <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                          {c.title}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
