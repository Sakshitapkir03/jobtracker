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
  job_count: number;
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

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  oauth_provider: string | null;
  created_at: string;
}

export interface Alert {
  id: string;
  user_id: string;
  role_keyword: string;
  is_active: boolean;
  last_notified_at: string | null;
  created_at: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Contact {
  id: string;
  user_id: string;
  company_id: string;
  name: string;
  title: string | null;
  email: string | null;
  linkedin_url: string | null;
  created_at: string;
  company_name?: string;
}
