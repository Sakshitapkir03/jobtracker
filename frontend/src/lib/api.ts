import axios from "axios";
import type { Company, Application, JobPosting, PaginatedResponse } from "@/types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

// ── Companies ──────────────────────────────────────────────────────────────
export const companiesApi = {
  list: (params?: { page?: number; size?: number; search?: string }) =>
    api.get<PaginatedResponse<Company>>("/api/v1/companies", { params }),
  get: (id: string) => api.get<Company>(`/api/v1/companies/${id}`),
  create: (data: Partial<Company>) => api.post<Company>("/api/v1/companies", data),
  update: (id: string, data: Partial<Company>) =>
    api.patch<Company>(`/api/v1/companies/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/companies/${id}`),
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<{ imported: number }>(
      "/api/v1/upload/companies-pdf",
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
  },
};

// ── Applications ───────────────────────────────────────────────────────────
export const applicationsApi = {
  list: (params?: { page?: number; size?: number; stage?: string; company_id?: string }) =>
    api.get<PaginatedResponse<Application>>("/api/v1/applications", { params }),
  get: (id: string) => api.get<Application>(`/api/v1/applications/${id}`),
  create: (data: Partial<Application>) =>
    api.post<Application>("/api/v1/applications", data),
  update: (id: string, data: Partial<Application>) =>
    api.patch<Application>(`/api/v1/applications/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/applications/${id}`),
};

// ── Jobs ───────────────────────────────────────────────────────────────────
export const jobsApi = {
  list: (params?: {
    page?: number;
    size?: number;
    company_id?: string;
    keyword?: string;
    location?: string;
    days?: number;
  }) => api.get<PaginatedResponse<JobPosting>>("/api/v1/jobs", { params }),
};

// ── Scraper ────────────────────────────────────────────────────────────────
export const scraperApi = {
  trigger: (company_id?: string) =>
    api.post<{ task_id: string; status: string }>("/api/v1/scraper/trigger", { company_id }),
  triggerAll: () =>
    api.post<{ task_id: string; status: string }>("/api/v1/scraper/trigger", {}),
  status: (company_id: string) =>
    api.get<{ company_id: string; status: string; task_id: string | null }>(
      `/api/v1/scraper/status/${company_id}`
    ),
};

export default api;
