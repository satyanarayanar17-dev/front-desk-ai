import { getSupabase } from "@/lib/supabase";

export type Membership = { company_id: string; role: "manager" | "employee" | "platform_owner"; status: string };
export type PortalAccess = { userId: string; email: string; isOwner: boolean; memberships: Membership[]; passwordChangeRequired: boolean };

/** Reads the signed-in user's role and memberships from backend-controlled tables (RLS-scoped to self). */
export async function getPortalAccess(): Promise<PortalAccess | null> {
  const sb = getSupabase();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return null;
  const { data: required, error: stateError } = await sb.rpc("get_my_password_state");
  if (stateError) throw stateError;
  const { data, error } = await sb.rpc("get_my_portal_access");
  if (error) throw error;
  const d = (data ?? {}) as { is_owner?: boolean; memberships?: Membership[] };
  return { userId: u.user.id, email: u.user.email ?? "", isOwner: !!d.is_owner, memberships: d.memberships ?? [], passwordChangeRequired: !!required };
}

export function activeMembership(a: PortalAccess, role?: "manager" | "employee") {
  return a.memberships.find((m) => m.status === "active" && (!role || m.role === role));
}

/** Routes by password state first, then backend-controlled role. */
export function portalDestination(a: Pick<PortalAccess, "isOwner" | "memberships"> & { passwordChangeRequired?: boolean }): "/owner/dashboard" | "/manager" | "/employee" | "/change-password" | null {
  if (needsPasswordChange(a)) return "/change-password";
  if (a.isOwner) return "/owner/dashboard";
  const active = a.memberships.filter((m) => m.status === "active");
  if (active.some((m) => m.role === "manager")) return "/manager";
  if (active.some((m) => m.role === "employee")) return "/employee";
  return null;
}

export function needsPasswordChange(a: { passwordChangeRequired?: boolean }) {
  return !!a.passwordChangeRequired || (typeof window !== "undefined" && window.sessionStorage.getItem("callwoven-password-recovery") === "1");
}
