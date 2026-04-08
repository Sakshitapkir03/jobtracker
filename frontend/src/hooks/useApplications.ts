import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationsApi } from "@/lib/api";
import type { Application } from "@/types";
import { toast } from "sonner";

export function useApplications(params?: {
  page?: number;
  size?: number;
  stage?: string;
  company_id?: string;
}) {
  return useQuery({
    queryKey: ["applications", params],
    queryFn: () => applicationsApi.list(params).then((r) => r.data),
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: ["applications", id],
    queryFn: () => applicationsApi.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Application>) => applicationsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Application added");
    },
    onError: () => toast.error("Failed to add application"),
  });
}

export function useUpdateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Application> }) =>
      applicationsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Application updated");
    },
    onError: () => toast.error("Failed to update application"),
  });
}

export function useDeleteApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => applicationsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Application removed");
    },
  });
}
