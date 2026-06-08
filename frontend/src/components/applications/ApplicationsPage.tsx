"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationsApi } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { Trash2, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { ApplicationStage } from "@/types";

const STAGES: ApplicationStage[] = [
  "BOOKMARKED", "APPLIED", "PHONE_SCREEN", "TECHNICAL", "ONSITE", "OFFER",
  "REJECTED", "WITHDRAWN",
];

const STAGE_LABELS: Record<ApplicationStage, string> = {
  BOOKMARKED: "Bookmarked",
  APPLIED: "Applied",
  PHONE_SCREEN: "Phone Screen",
  TECHNICAL: "Technical",
  ONSITE: "Onsite",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

const STAGE_COLORS: Record<ApplicationStage, string> = {
  BOOKMARKED: "bg-secondary-container/50 text-on-secondary-container border border-secondary-container",
  APPLIED: "bg-primary-container/10 text-primary-container border border-primary-container/20 shadow-[0_0_8px_rgba(0,209,255,0.2)]",
  PHONE_SCREEN: "bg-yellow-500/10 text-yellow-300 border border-yellow-500/20",
  TECHNICAL: "bg-tertiary-container/20 text-tertiary border border-tertiary-container/30",
  ONSITE: "bg-orange-500/10 text-orange-300 border border-orange-500/20",
  OFFER: "bg-green-500/10 text-green-300 border border-green-500/20 shadow-[0_0_8px_rgba(34,197,94,0.2)]",
  REJECTED: "bg-error-container/20 text-error border border-error/20",
  WITHDRAWN: "bg-surface-container-high text-on-surface-variant border border-outline-variant",
};

export function ApplicationsPage() {
  const qc = useQueryClient();
  const [stageFilter, setStageFilter] = useState<ApplicationStage | "">("");

  const { data: all } = useQuery({
    queryKey: ["applications-all"],
    queryFn: () => applicationsApi.list({ size: 1000 }).then((r) => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["applications", stageFilter],
    queryFn: () =>
      applicationsApi.list({ size: 200, stage: stageFilter || undefined }).then((r) => r.data),
  });

  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s] = all?.items.filter((a) => a.stage === s).length ?? 0;
    return acc;
  }, {} as Record<ApplicationStage, number>);

  const updateMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: ApplicationStage }) =>
      applicationsApi.update(id, { stage }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["applications-all"] });
    },
    onError: () => toast.error("Failed to update stage"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => applicationsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["applications-all"] });
      toast.success("Removed");
    },
  });

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div>
        <h1 className="font-display text-xl font-bold text-on-surface">Applications</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">
          {all?.total ?? 0} total · track every role you&apos;ve applied to
        </p>
      </div>

      {/* Stage filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setStageFilter("")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            stageFilter === ""
              ? "bg-primary text-primary-foreground border-primary"
              : "border-outline-variant text-on-surface-variant hover:text-primary bg-transparent"
          }`}
        >
          All {all?.total ? `(${all.total})` : ""}
        </button>
        {STAGES.map((s) => (
          <button
            key={s}
            onClick={() => setStageFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              stageFilter === s
                ? "bg-primary text-primary-foreground border-primary"
                : "border-outline-variant text-on-surface-variant hover:text-primary bg-transparent"
            }`}
          >
            {STAGE_LABELS[s]}
            {stageCounts[s] > 0 && (
              <span className={`ml-1.5 ${stageFilter === s ? "opacity-80" : "text-on-surface-variant"}`}>
                {stageCounts[s]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-xl border border-outline-variant bg-surface-container-low animate-pulse"
            />
          ))}
        </div>
      ) : !data?.items.length ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-16 text-center">
          <FileText className="h-10 w-10 mx-auto text-on-surface-variant/30 mb-3" />
          <p className="font-medium text-on-surface">No applications yet</p>
          <p className="text-sm text-on-surface-variant mt-1">
            Click <strong>+ Applied</strong> on any job in the feed to save it here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-lowest">
                <th className="text-left px-4 py-3 font-mono text-xs text-on-surface-variant uppercase tracking-widest">
                  Role
                </th>
                <th className="text-left px-4 py-3 font-mono text-xs text-on-surface-variant uppercase tracking-widest">
                  Company
                </th>
                <th className="text-left px-4 py-3 font-mono text-xs text-on-surface-variant uppercase tracking-widest">
                  Stage
                </th>
                <th className="text-left px-4 py-3 font-mono text-xs text-on-surface-variant uppercase tracking-widest hidden md:table-cell">
                  Applied
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {data.items.map((app) => (
                <tr key={app.id} className="hover:bg-primary/5 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-on-surface truncate max-w-[200px] sm:max-w-[260px]">
                        {app.job_title}
                      </span>
                      {app.job_url && (
                        <a
                          href={app.job_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-on-surface-variant hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-sm">
                    {app.company?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={app.stage}
                      onChange={(e) =>
                        updateMutation.mutate({
                          id: app.id,
                          stage: e.target.value as ApplicationStage,
                        })
                      }
                      className={`rounded-full px-2.5 py-1 text-xs font-medium border-0 cursor-pointer appearance-none ${STAGE_COLORS[app.stage]}`}
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s} className="bg-surface-container text-on-surface">
                          {STAGE_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant hidden md:table-cell">
                    {formatDistanceToNow(new Date(app.applied_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-on-surface-variant hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteMutation.mutate(app.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
