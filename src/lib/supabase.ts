import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser-safe config only. Publishable key is intended for client use; data
// access is enforced by Supabase Auth + Row Level Security.
export const SUPABASE_URL = "https://gtlfkvsqkxyktxqjgrbs.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ZZ8QYI8tGNEunG8f6UlvVA_DkbP-iED";
export const WEBHOOK_HEALTH_URL = `${SUPABASE_URL}/functions/v1/vapi-webhook`;

// UI-only pre-check. Real security is RLS.
export const OWNER_EMAILS = [
  "satyanarayanareddy.tethala@gmail.com",
  "satyanarayanareddy.job@gmail.com",
];
export const isOwnerEmail = (email?: string | null) =>
  !!email && OWNER_EMAILS.includes(email.trim().toLowerCase());

let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (!client) {
    const isBrowser = typeof window !== "undefined";
    client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: isBrowser,
        autoRefreshToken: isBrowser,
        detectSessionInUrl: isBrowser,
      },
    });
  }
  return client;
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
