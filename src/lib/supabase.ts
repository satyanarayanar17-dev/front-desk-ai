import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// App data lives in Lovable Cloud. The generated client below carries the
// publishable key and the user's session; data access is enforced by
// Row Level Security in the database.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
export const WEBHOOK_HEALTH_URL = "/api/public/webhooks/vapi";

// UI-only pre-check. Real security is RLS.
export const OWNER_EMAILS = [
  "satyanarayanareddy.tethala@gmail.com",
  "satyanarayanareddy.job@gmail.com",
];
export const isOwnerEmail = (email?: string | null) =>
  !!email && OWNER_EMAILS.includes(email.trim().toLowerCase());

export function getSupabase(): SupabaseClient<Database> {
  return supabase as unknown as SupabaseClient<Database>;
}

export function friendlyError(err: unknown): string {
  const msg = (err as { message?: string })?.message ?? "";
  if (/fetch|network/i.test(msg)) return "Couldn't reach the server. Check your connection and try again.";
  if (/rate limit/i.test(msg)) return "Too many attempts. Please wait a minute and try again.";
  if (/permission|row-level|rls|401|403|JWT/i.test(msg)) return "You don't have permission to do that.";
  return "Something went wrong. Please try again.";
}

export type Lead = {
  id: string;
  created_at: string;
  updated_at: string | null;
  vapi_call_id: string | null;
  event_type: string | null;
  assistant_id: string | null;
  structured_output_name: string | null;
  caller_name: string | null;
  caller_phone: string | null;
  postcode: string | null;
  full_address: string | null;
  existing_customer: boolean | null;
  service_category: string | null;
  issue_summary: string | null;
  urgency: string | null;
  property_type: string | null;
  boiler_make_model: string | null;
  boiler_error_code: string | null;
  has_active_leak: boolean | null;
  leak_contained: boolean | null;
  no_heating: boolean | null;
  no_hot_water: boolean | null;
  suspected_gas_leak: boolean | null;
  carbon_monoxide_concern: boolean | null;
  drainage_blockage: boolean | null;
  vulnerable_occupant: boolean | null;
  vulnerable_occupant_notes: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  caller_role: string | null;
  consent_to_callback: boolean | null;
  call_summary: string | null;
  recommended_business_action: string | null;
  status: string | null;
  raw_payload: unknown;
  company_id: string | null;
  assignment_status: string;
  assigned_by: string | null;
  assigned_at: string | null;
  match_reason: string | null;
};

export type PilotInterest = {
  id: string;
  created_at: string;
  business_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  calls_per_week: string | null;
  notes: string | null;
  status: string | null;
};

export type Company = {
  id: string;
  created_at: string;
  updated_at: string | null;
  name: string;
  slug: string;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
};

export type CompanyMembership = {
  id: string;
  company_id: string;
  user_id: string;
  role: "manager" | "employee";
  status: "active" | "deactivated";
  created_at: string;
};

export type CompanySettings = {
  company_id: string;
  seat_limit: number;
  included_minutes: number;
  features: Record<string, boolean> | null;
  assistant_id: string | null;
  inbound_phone_number: string | null;
  call_routing_status: string;
  updated_at: string | null;
};

export type EnquiryNote = {
  id: string;
  lead_id: string;
  company_id: string;
  author_user_id: string;
  body: string;
  created_at: string;
};

export type CompanyInvitation = {
  id: string;
  company_id: string;
  email: string;
  role: "manager" | "employee";
  status: "recorded" | "accepted";
  created_by: string | null;
  created_at: string;
  accepted_user_id: string | null;
  accepted_at: string | null;
};

export type HistoryEntry = {
  id: string;
  company_id: string | null;
  table_name: string;
  record_id: string | null;
  actor_user_id: string | null;
  action: string;
  changes: Record<string, unknown> | null;
  created_at: string;
};

export const LEAD_STATUSES = ["new", "urgent", "callback_requested", "closed"] as const;
export const URGENCIES = ["emergency", "urgent_same_day", "routine"] as const;
export const PILOT_STATUSES = ["new", "contacted", "pilot_started", "won", "lost"] as const;

export const label = (v?: string | null) =>
  v ? v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "—";

export const fmtTime = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};
