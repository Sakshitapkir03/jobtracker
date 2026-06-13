import axios from "axios";
import type { Alert, Company, Application, JobPosting, Notification, PaginatedResponse, Contact } from "@/types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "",
  headers: { "Content-Type": "application/json" },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("jt_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear auth and redirect to login
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("jt_token");
      localStorage.removeItem("jt_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ── Companies ──────────────────────────────────────────────────────────────
export const companiesApi = {
  list: (params?: { page?: number; size?: number; search?: string; role_keyword?: string }) =>
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
    entry_level?: boolean;
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

// ── Notifications ──────────────────────────────────────────────────────────
export const notificationsApi = {
  list: () => api.get<Notification[]>("/api/v1/notifications"),
  markRead: (id: string) => api.patch(`/api/v1/notifications/${id}/read`),
  markAllRead: () => api.patch("/api/v1/notifications/read-all"),
};

// ── Auth ───────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; full_name?: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
};

// ── Contacts ───────────────────────────────────────────────────────────────
export const contactsApi = {
  listAll: () => api.get<Contact[]>("/api/v1/contacts"),
  list: (companyId: string) => api.get<Contact[]>(`/api/v1/contacts/${companyId}`),
  search: (companyId: string) => api.post<Contact[]>(`/api/v1/contacts/${companyId}/search`),
};

// ── Alerts ─────────────────────────────────────────────────────────────────
export const alertsApi = {
  list: () => api.get<Alert[]>("/api/v1/alerts"),
  create: (role_keyword: string) =>
    api.post<Alert>("/api/v1/alerts", { role_keyword }),
  delete: (id: string) => api.delete(`/api/v1/alerts/${id}`),
};

export default api;
