import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { companiesApi } from "@/lib/api";
import type { Company } from "@/types";
import { toast } from "sonner";

export function useCompanies(params?: { page?: number; size?: number; search?: string }) {
  return useQuery({
    queryKey: ["companies", params],
    queryFn: () => companiesApi.list(params).then((r) => r.data),
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: ["companies", id],
    queryFn: () => companiesApi.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Company>) => companiesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company added");
    },
  });
}

export function useUploadCompaniesPDF() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => companiesApi.uploadPDF(file),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      toast.success(`Imported ${res.data.imported} companies from PDF`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ? `Import failed: ${msg}` : "PDF import failed");
    },
  });
}
