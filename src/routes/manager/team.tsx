import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useLiveTable } from "@/hooks/use-live-table";
import { fmtTime, getSupabase, label, type CompanyInvitation, type CompanyMembership } from "@/lib/supabase";

export const Route = createFileRoute("/manager/team")({ staticData: { sitemap: false }, component: TeamPage });

function TeamPage() {
  const { companyId, userId } = Route.useRouteContext();
  const { rows: memberships, reload: reloadM } = useLiveTable<CompanyMembership>("company_memberships");
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const mine = memberships.filter((m) => m.company_id === companyId);

  const reloadI = () => {
    getSupabase().from("company_invitations").select("*").eq("company_id", companyId).order("created_at", { ascending: false })
      .then(({ data }) => setInvitations((data ?? []) as CompanyInvitation[]));
  };
  useEffect(reloadI, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const record = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    const role = fd.get("role") === "manager" ? "manager" : "employee";
    setMsg(null);
    if (!email) {
      setMsg("Enter the team member's email.");
      return;
    }
    const { error } = await getSupabase().from("company_invitations").insert({ company_id: companyId, email, role });
    if (error) {
      setMsg(`Couldn't record invitation: ${error.message}`);
      return;
    }
    setMsg(`Reserved ${role} place for ${email}. Callwoven must finish account setup before they can sign in. No email has been sent.`);
    form.reset();
    reloadI();
  };

  return (
    <div>
      <h1 className="text-xl font-semibold">Team</h1>
      {msg && <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{msg}</p>}

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

      <h2 className="mt-8 text-lg font-semibold">Add a team member</h2>
      <form onSubmit={record} className="mt-3 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <label className="text-xs font-medium text-muted-foreground">
          Email
          <input name="email" type="email" required className="mt-1 block w-64 rounded-md border border-input bg-card px-2.5 py-2 text-sm" placeholder="colleague@business.co.uk" />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Role
          <select name="role" className="mt-1 block rounded-md border border-input bg-card px-2.5 py-2 text-sm">
            <option value="employee">Employee</option>

          </select>
        </label>
        <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Record member</button>
      </form>
      <p className="mt-2 text-xs text-muted-foreground">This reserves a place only. Callwoven must finish account setup; it does not send an email or create a login.</p>

      <h2 className="mt-8 text-lg font-semibold">Recorded invitations</h2>
      <div className="mt-3 grid gap-2">
        {invitations.map((i) => (
          <div key={i.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm shadow-sm">
            <span className="font-medium">{i.email}</span>
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-ink">{label(i.role)}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">{label(i.status)}</span>
            <span className="ml-auto text-xs text-muted-foreground">{fmtTime(i.created_at)}</span>
          </div>
        ))}
        {invitations.length === 0 && <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>}
      </div>
    </div>
  );
}
