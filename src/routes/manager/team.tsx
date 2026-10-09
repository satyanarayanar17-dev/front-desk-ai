import { CreateClientLogin } from "@/components/CreateClientLogin";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLiveTable } from "@/hooks/use-live-table";
import { fmtTime, getSupabase, label, type CompanyInvitation, type CompanyMembership } from "@/lib/supabase";

export const Route = createFileRoute("/manager/team")({ staticData: { sitemap: false }, component: TeamPage });

function TeamPage() {
  const { companyId, userId } = Route.useRouteContext();
  const { rows: memberships, reload: reloadM } = useLiveTable<CompanyMembership>("company_memberships");
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  useEffect(() => { getSupabase().from("company_settings").select("seat_limit").eq("company_id", companyId).single().then(({data}) => setLimit(data?.seat_limit ?? null)); }, [companyId]);

  const mine = memberships.filter((m) => m.company_id === companyId);

  const reloadI = () => {
    getSupabase().from("company_invitations").select("*").eq("company_id", companyId).order("created_at", { ascending: false })
      .then(({ data }) => setInvitations((data ?? []) as CompanyInvitation[]));
  };
  useEffect(reloadI, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancelRequest = async (id: string) => {
    setMessage(null);
    const {error} = await getSupabase().from("company_invitations").update({status:"cancelled"}).eq("id", id).eq("company_id", companyId).eq("status", "recorded");
    setMessage(error ? `Could not cancel request: ${error.message}` : "Request cancelled. The reserved place is available again.");
    reloadI();
  };
  return (
    <div>
      <h1 className="text-xl font-semibold">Team</h1>
      {message && <p role="status" className="mt-3 text-sm">{message}</p>}
      <p className="mt-2 text-sm text-muted-foreground">{mine.filter(m => m.status === "active").length} active people · {limit ?? "…"} total places. Managers and employees both count. Recorded requests also reserve a place.</p>

      <div className="mt-5 grid gap-2">
        {mine.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{m.user_id === userId ? "You" : m.user_id.slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground">Joined {fmtTime(m.created_at)}</p>
            </div>
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-ink">{label(m.role)}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">{label(m.status)}</span>
          </div>
        ))}
        {mine.length === 0 && <p className="text-sm text-muted-foreground">No team members yet.</p>}
      </div>

      <CreateClientLogin companyId={companyId} active={limit !== null} employeeOnly onCreated={() => { reloadM(); reloadI(); }} />

      <h2 className="mt-8 text-lg font-semibold">Earlier team requests</h2>
      <p className="mt-2 text-xs text-muted-foreground">These earlier records did not create logins. Use Add employee to finish setup with the same email. Existing accounts require Callwoven support.</p>
      <div className="mt-3 grid gap-2">
        {invitations.map((i) => (
          <div key={i.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm shadow-sm">
            <span className="font-medium">{i.email}</span>
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-ink">{label(i.role)}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">{label(i.status)}</span>
            <span className="ml-auto text-xs text-muted-foreground">{fmtTime(i.created_at)}</span>
            {i.status === "recorded" && <button onClick={() => cancelRequest(i.id)} className="rounded-full border border-border px-3 py-1 text-xs">Cancel request</button>}
          </div>
        ))}
        {invitations.length === 0 && <p className="text-sm text-muted-foreground">No earlier requests.</p>}
      </div>
    </div>
  );
}
