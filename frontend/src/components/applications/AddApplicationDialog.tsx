"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateApplication } from "@/hooks/useApplications";
import { useCompanies } from "@/hooks/useCompanies";
import type { ApplicationStage } from "@/types";

const schema = z.object({
  job_title: z.string().min(1, "Required"),
  company_id: z.string().min(1, "Required"),
  job_url: z.string().url().optional().or(z.literal("")),
  applied_at: z.string().min(1, "Required"),
  stage: z.enum(["BOOKMARKED","APPLIED","PHONE_SCREEN","TECHNICAL","ONSITE","OFFER","REJECTED","WITHDRAWN"]).default("APPLIED"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function AddApplicationDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const create = useCreateApplication();
  const { data: companies } = useCompanies({ size: 200 });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { applied_at: new Date().toISOString().split("T")[0], stage: "APPLIED" },
  });

  async function onSubmit(values: FormValues) {
    await create.mutateAsync(values);
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Application</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Job Title</Label>
            <Input {...register("job_title")} placeholder="Software Engineer" />
            {errors.job_title && <p className="text-xs text-destructive">{errors.job_title.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Company</Label>
            <select {...register("company_id")} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Select company…</option>
              {companies?.items.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.company_id && <p className="text-xs text-destructive">{errors.company_id.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date Applied</Label>
              <Input type="date" {...register("applied_at")} />
            </div>
            <div className="space-y-2">
              <Label>Stage</Label>
              <select {...register("stage")} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                <option value="BOOKMARKED">Bookmarked</option>
                <option value="APPLIED">Applied</option>
                <option value="PHONE_SCREEN">Phone Screen</option>
                <option value="TECHNICAL">Technical</option>
                <option value="ONSITE">Onsite</option>
                <option value="OFFER">Offer</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Job URL (optional)</Label>
            <Input {...register("job_url")} placeholder="https://..." />
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending}>
            {create.isPending ? "Adding..." : "Add Application"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
