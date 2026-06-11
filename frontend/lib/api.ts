function resolveApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return `${window.location.origin}/_/backend`;
  }
  return "http://localhost:8000";
}

const API_BASE = resolveApiBase();

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setAuth(token: string, user: unknown) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const auth = {
  requestOtp: (email: string) =>
    api<{ message: string }>("/api/auth/register/request-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  verifyOtp: (data: Record<string, string>) =>
    api<{ access_token: string; user: unknown }>("/api/auth/register/verify", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: async (email: string, password: string) => {
    const body = new URLSearchParams({ username: email, password });
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Invalid credentials" }));
      throw new Error(err.detail || "Invalid credentials");
    }
    return res.json();
  },
  me: () => api<unknown>("/api/auth/me"),
  oauthStartUrl: (provider: "google" | "apple" | "meta") =>
    `${API_BASE}/api/auth/${provider}/start`,
};

export const search = {
  parse: (brief: string) =>
    api<{ filters: Record<string, unknown> }>("/api/search/parse", {
      method: "POST",
      body: JSON.stringify({ brief }),
    }),
  creators: (brief: string, filters?: Record<string, unknown>) =>
    api<{ filters: Record<string, unknown>; results: CreatorResult[] }>(
      "/api/search/creators",
      {
        method: "POST",
        body: JSON.stringify({ brief, filters, limit: 20 }),
      }
    ),
};

export const campaigns = {
  list: () => api<Campaign[]>("/api/campaigns"),
  get: (id: number) => api<Campaign>(`/api/campaigns/${id}`),
  create: (data: { title: string; brief_text: string; budget?: string; parsed_filters?: Record<string, unknown> }) =>
    api<Campaign>("/api/campaigns", { method: "POST", body: JSON.stringify(data) }),
  shortlist: (id: number) => api<ShortlistItem[]>(`/api/campaigns/${id}/shortlist`),
  addShortlist: (id: number, creator_id: number, rank_score: number, match_reasons: string[]) =>
    api<{ id: number }>(`/api/campaigns/${id}/shortlist`, {
      method: "POST",
      body: JSON.stringify({ creator_id, rank_score, match_reasons }),
    }),
  feedback: (campaignId: number, itemId: number) =>
    api<Feedback[]>(`/api/campaigns/${campaignId}/shortlist/${itemId}/feedback`),
  addFeedback: (campaignId: number, itemId: number, comment: string, rating?: number) =>
    api<Feedback>(`/api/campaigns/${campaignId}/shortlist/${itemId}/feedback`, {
      method: "POST",
      body: JSON.stringify({ comment, rating }),
    }),
  approve: (campaignId: number, itemId: number, status: "approved" | "rejected") =>
    api<{ approval_status: string }>(`/api/campaigns/${campaignId}/shortlist/${itemId}/approve`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),
  team: (id: number) => api<TeamMember[]>(`/api/campaigns/${id}/team`),
  addTeam: (id: number, email: string, role: string) =>
    api<TeamMember>(`/api/campaigns/${id}/team`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),
  outreach: (campaignId: number, itemId: number) =>
    api<OutreachMessage[]>(`/api/campaigns/${campaignId}/shortlist/${itemId}/outreach`),
  sendOutreach: (campaignId: number, itemId: number, data: { subject: string; body: string; template_id?: number }) =>
    api<{ id: number }>(`/api/campaigns/${campaignId}/shortlist/${itemId}/outreach`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  analytics: (id: number) => api<AnalyticsResult>(`/api/campaigns/${id}/analytics`),
  addPost: (id: number, data: Record<string, unknown>) =>
    api<{ id: number }>(`/api/campaigns/${id}/posts`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const templates = {
  list: () => api<EmailTemplate[]>("/api/templates"),
  create: (data: { name: string; template_type: string; subject: string; body: string }) =>
    api<EmailTemplate>("/api/templates", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: { name?: string; subject?: string; body?: string }) =>
    api<EmailTemplate>(`/api/templates/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  preview: (data: Record<string, unknown>) =>
    api<{ subject: string; body: string }>("/api/templates/preview", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const insights = {
  weekly: () => api<InsightSnapshot[]>("/api/insights/weekly"),
};

export interface CreatorResult {
  id: number;
  handle: string;
  display_name: string;
  platform: string;
  profile_url: string;
  profile_image_url?: string;
  categories: string;
  followers: number;
  audience_country: string;
  engagement_rate: number;
  engagement_avg: number;
  rank: number;
  score: number;
  cluster: number;
  match_reasons: string[];
}

export interface Campaign {
  id: number;
  title: string;
  brief_text: string;
  parsed_filters: Record<string, unknown>;
  status: string;
  budget: string;
  created_at: string;
  owner_id: number;
}

export interface ShortlistItem {
  id: number;
  creator: CreatorResult;
  rank_score: number;
  match_reasons: string[];
  approval_status: string;
  outreach_status: string;
  notes: string;
  approved_at: string | null;
  feedback_count: number;
}

export interface Feedback {
  id: number;
  author_id: number;
  author_name: string;
  rating: number | null;
  comment: string;
  created_at: string;
}

export interface TeamMember {
  id: number;
  user_id: number;
  email: string;
  full_name: string;
  role: string;
  invited_at: string;
}

export interface EmailTemplate {
  id: number;
  name: string;
  template_type: string;
  subject: string;
  body: string;
  is_system: boolean;
  owner_id: number | null;
}

export interface OutreachMessage {
  id: number;
  subject: string;
  body: string;
  sender_id: number;
  sent_at: string;
  template_id: number | null;
}

export interface AnalyticsResult {
  posts: Array<Record<string, unknown>>;
  summary: Record<string, unknown>;
}

export interface InsightSnapshot {
  week_label: string;
  category: string;
  payload: Record<string, unknown>;
}

export function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(Math.round(n));
}
