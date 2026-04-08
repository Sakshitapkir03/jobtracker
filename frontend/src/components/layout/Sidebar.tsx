"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Building2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Job Feed", href: "/jobs", icon: Briefcase },
  { label: "Companies", href: "/companies", icon: Building2 },
  { label: "Applications", href: "/applications", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-card px-3 py-6 shrink-0">
      <div className="mb-8 px-2">
        <h1 className="text-lg font-bold text-primary">H1B Job Finder</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Real-time job discovery</p>
      </div>
      <nav className="flex-1 space-y-1">
        {nav.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
