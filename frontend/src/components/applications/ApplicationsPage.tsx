"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationsApi } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { Trash2, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  BOOKMARKED: "bg-slate-100 text-slate-700",
  APPLIED: "bg-blue-100 text-blue-700",
  PHONE_SCREEN: "bg-yellow-100 text-yellow-700",
  TECHNICAL: "bg-purple-100 text-purple-700",
  ONSITE: "bg-orange-100 text-orange-700",
  OFFER: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  WITHDRAWN: "bg-gray-100 text-gray-700",
};

export function ApplicationsPage() {
  const qc = useQueryClient();
  const [stageFilter, setStageFilter] = useState<ApplicationStage | "">("");

  const { data, isLoading } = useQuery({
    queryKey: ["applications", stageFilter],
    queryFn: () =>
      applicationsApi
        .list({ size: 200, stage: stageFilter || undefined })
        .then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: ApplicationStage }) =>
      applicationsApi.update(id, { stage }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: () => toast.error("Failed to update stage"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => applicationsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Application removed");
    },
  });

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Applications</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track every job you've applied to
        </p>
      </div>

      {/* Stage filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStageFilter("")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            stageFilter === ""
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background hover:bg-muted"
          }`}
        >
          All ({data?.total ?? 0})
        </button>
        {STAGES.map((s) => (
          <button
            key={s}
            onClick={() => setStageFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              stageFilter === s
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted"
            }`}
          >
            {STAGE_LABELS[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg border bg-card animate-pulse" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No applications yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Click <strong>+ Applied</strong> on any job in the feed to save it here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Role</th>
                <th className="text-left px-4 py-2.5 font-medium">Company</th>
                <th className="text-left px-4 py-2.5 font-medium">Stage</th>
                <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Applied</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((app) => (
                <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate max-w-[200px]">{app.job_title}</span>
                      {app.job_url && (
                        <a
                          href={app.job_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:opacity-70"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
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
                      className={`rounded-full px-2.5 py-1 text-xs font-medium border-0 cursor-pointer ${
                        STAGE_COLORS[app.stage]
                      }`}
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {STAGE_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                    {formatDistanceToNow(new Date(app.applied_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
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
