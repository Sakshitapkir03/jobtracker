export type ApplicationStage =
  | "BOOKMARKED"
  | "APPLIED"
  | "PHONE_SCREEN"
  | "TECHNICAL"
  | "ONSITE"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN";

export type ScrapeStatus = "idle" | "queued" | "running" | "done" | "failed";

export interface Company {
  id: string;
  name: string;
  website: string | null;
  careers_url: string | null;
  logo_url: string | null;
  industry: string | null;
  notes: string | null;
  last_scraped_at: string | null;
  created_at: string;
}

export interface Application {
  id: string;
  company_id: string;
  company?: Company;
  job_title: string;
  job_url: string | null;
  stage: ApplicationStage;
  applied_at: string;
  notes: string | null;
  salary_range: string | null;
  updated_at: string;
}

export interface JobPosting {
  id: string;
  company_id: string;
  company?: Company;
  title: string;
  url: string;
  location: string | null;
  description: string | null;
  posted_at: string | null;
  is_new: boolean;
  scraped_at: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
