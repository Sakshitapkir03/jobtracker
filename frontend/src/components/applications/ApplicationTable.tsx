"use client";

import { useState } from "react";
import { useApplications, useUpdateApplication, useDeleteApplication } from "@/hooks/useApplications";
import { STAGE_LABELS, STAGE_COLORS, formatDate } from "@/lib/utils";
import type { Application, ApplicationStage } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

const STAGES: ApplicationStage[] = [
  "BOOKMARKED", "APPLIED", "PHONE_SCREEN", "TECHNICAL", "ONSITE", "OFFER", "REJECTED", "WITHDRAWN",
];

export function ApplicationTable() {
  const [stageFilter, setStageFilter] = useState<string>("");
  const { data, isLoading } = useApplications({ stage: stageFilter || undefined, size: 100 });
  const updateApp = useUpdateApplication();
  const deleteApp = useDeleteApplication();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStageFilter("")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            stageFilter === "" ? "bg-primary text-white" : "bg-muted hover:bg-accent"
          }`}
        >
          All
        </button>
        {STAGES.map((s) => (
          <button
            key={s}
            onClick={() => setStageFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              stageFilter === s ? "bg-primary text-white" : "bg-muted hover:bg-accent"
            }`}
          >
            {STAGE_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Applied</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No applications yet
                </td>
              </tr>
            ) : (
              data?.items.map((app) => (
                <tr key={app.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{app.job_title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {app.company?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={app.stage}
                      onChange={(e) =>
                        updateApp.mutate({ id: app.id, data: { stage: e.target.value as ApplicationStage } })
                      }
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[app.stage]}`}
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(app.applied_at)}</td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:text-destructive"
                      onClick={() => deleteApp.mutate(app.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
