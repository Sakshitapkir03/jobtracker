"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Briefcase, Building2, FileText, Zap, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Job Feed", href: "/jobs", icon: Briefcase },
  { label: "Companies", href: "/companies", icon: Building2 },
  { label: "Applications", href: "/applications", icon: FileText },
  { label: "Connections", href: "/connections", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full flex-col border-r border-outline-variant bg-surface-container shrink-0 w-14 lg:w-64">
      {/* Brand */}
      <div className="px-3 lg:px-4 py-4 border-b border-outline-variant mb-2">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="hidden lg:block">
            <p className="font-display text-base font-bold text-primary">H1B Tracker</p>
            <p className="text-xs text-on-surface-variant opacity-70">Career Dashboard</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-0 space-y-0.5">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 lg:px-4 py-2.5 text-sm transition-colors duration-100",
                active
                  ? "border-r-4 border-primary bg-primary/5 text-primary font-bold"
                  : "font-medium text-on-surface-variant hover:bg-secondary-container/20 hover:text-primary"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="hidden lg:inline">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* New Application CTA */}
      <div className="p-3 lg:p-4 mt-auto border-t border-outline-variant">
        <Link
          href="/applications"
          className="flex items-center justify-center lg:justify-start gap-2 w-full bg-primary text-primary-foreground font-bold py-2 px-4 rounded-lg hover:opacity-90 active:scale-95 transition-all text-sm"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span className="hidden lg:inline">New Application</span>
        </Link>
      </div>
    </aside>
  );
}
