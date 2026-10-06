import { TranscriptAnalysis } from "@/components/TranscriptAnalysis";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useLiveTable } from "@/hooks/use-live-table";
import { friendlyError, fmtTime, getSupabase, label, LEAD_STATUSES, type Company, type CompanyMembership, type EnquiryNote, type Lead } from "@/lib/supabase";

export const Route = createFileRoute("/manager/")({ staticData: { sitemap: false }, component: ManagerCalls });

const urgencyClass = (u?: string | null) =>
  u === "emergency"
    ? "bg-destructive/10 text-destructive"
    : u === "urgent_same_day"
      ? "bg-brand-soft text-brand-ink"
      : "bg-muted text-muted-foreground";

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}>{children}</span>;
}

function ManagerCalls() {
  const { companyId } = Route.useRouteContext();
  const { rows, loading, error, realtime, reload, updateStatus } = useLiveTable<Lead>("frontdesk_leads", { companyId });
  const [team, setTeam] = useState<CompanyMembership[]>([]);
  useEffect(() => { getSupabase().from("company_memberships").select("*").eq("company_id", companyId).eq("role", "employee").eq("status", "active").then(({data}) => setTeam((data ?? []) as CompanyMembership[])); }, [companyId]);
  const [notes, setNotes] = useState<EnquiryNote[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [q, setQ] = useState("");
  const sel = "rounded-md border border-input bg-card px-2.5 py-2 text-sm";

  useEffect(() => {
    getSupabase().from("companies").select("*").then(({ data }) => setCompanies((data ?? []) as Company[]));
  }, []);

  const open = rows.find((r) => r.id === openId);
  const companyName = (id: string | null) => companies.find((c) => c.id === id)?.name ?? "—";

  useEffect(() => {
    if (!open) return;
    setNoteBody("");
    getSupabase().from("enquiry_notes").select("*").eq("lead_id", open.id).order("created_at", { ascending: false })
      .then(({ data }) => setNotes((data ?? []) as EnquiryNote[]));
  }, [open?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const addNote = async () => {
    if (!open || !noteBody.trim()) return;
    setMsg(null);
    const { data: user } = await getSupabase().auth.getUser();
    const { error } = await getSupabase().from("enquiry_notes").insert({
      lead_id: open.id,
      company_id: companyId,
      author_user_id: user.user?.id ?? "",
      body: noteBody.trim(),
    });
    if (error) {
      setMsg(friendlyError(error));
      return;
    }
    setNoteBody("");
    const { data } = await getSupabase().from("enquiry_notes").select("*").eq("lead_id", open.id).order("created_at", { ascending: false });
    setNotes((data ?? []) as EnquiryNote[]);
  };

  const filtered = rows.filter((r) => {
    if (r.company_id !== companyId) return false;
    if (q) {
      const hay = [r.caller_name, r.caller_phone, r.postcode, r.issue_summary].join(" ").toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Calls</h1>
        <span className="text-xs text-muted-foreground">{realtime ? "Live updates on" : "Auto-refresh every 30s"}</span>
        <button onClick={reload} className="ml-auto rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted">Refresh</button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, postcode, issue" className={`${sel} min-w-0 flex-1 sm:max-w-xs`} />
      </div>

      {error && <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="mt-5 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-card" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {rows.length === 0 ? "No calls captured for your company yet." : "No calls match this search."}
        </div>
      ) : (
        <div className="mt-5 grid gap-2">
          {filtered.map((r) => (
            <button key={r.id} onClick={() => setOpenId(r.id)} className="rounded-xl border border-border bg-card p-4 text-left shadow-sm hover:border-ring">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={urgencyClass(r.urgency)}>{label(r.urgency)}</Badge>
                <span className="font-semibold">{r.caller_name || "Unknown caller"}</span>
                <span className="text-sm text-muted-foreground">{r.caller_phone || "—"} · {r.postcode || "—"}</span>
                <span className="ml-auto text-xs text-muted-foreground">{fmtTime(r.created_at)}</span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-sm">{r.issue_summary || "No issue summary"}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{label(r.service_category)}</span>
                <Badge className="bg-muted text-foreground">{label(r.status ?? "new")}</Badge>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-foreground/30" onClick={() => setOpenId(null)}>
          <aside className="h-full w-full max-w-xl overflow-y-auto bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <Badge className={urgencyClass(open.urgency)}>{label(open.urgency)}</Badge>
                <h2 className="mt-2 text-lg font-semibold">{open.caller_name || "Unknown caller"}</h2>
              </div>
              <button onClick={() => setOpenId(null)} className="rounded-md border border-border px-2.5 py-1 text-sm">Close</button>
            </div>

            <label className="mt-4 block text-xs font-medium text-muted-foreground">
              Status
              <select
                value={open.status ?? "new"}
                onChange={async (e) => setMsg(await updateStatus(open.id, e.target.value))}
                className={`${sel} mt-1 block w-full`}
              >
                {LEAD_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
              </select>
            </label>
            <label className="mt-4 block text-sm font-medium">Assigned employee
              <select aria-label="Assigned employee" className={`${sel} mt-1 block w-full`} value={open.assigned_employee_id ?? ""} onChange={async (e) => {
                const {data,error} = await getSupabase().from("frontdesk_leads").update({assigned_employee_id:e.target.value || null}).eq("id",open.id).select("id");
                setMsg(error ? friendlyError(error) : !data?.length ? "Assignment was not permitted." : null); reload();
              }}><option value="">Unassigned</option>{team.map(m => <option key={m.id} value={m.user_id}>{m.user_id.slice(0,8)}</option>)}</select>
            </label>
            {msg && <p className="mt-2 text-xs text-destructive">{msg}</p>}

            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Team notes</h3>
              <textarea
                rows={2}
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Add a note about this call…"
                className={`${sel} mt-2 block w-full resize-none`}
              />
              <button onClick={addNote} disabled={!noteBody.trim()} className="mt-2 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">Add note</button>
              <div className="mt-3 space-y-2">
                {notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No notes yet.</p>
                ) : notes.map((n) => (
                  <div key={n.id} className="rounded-lg bg-muted px-3 py-2 text-sm">
                    <p className="whitespace-pre-wrap">{n.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{fmtTime(n.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>

            <TranscriptAnalysis key={open.id} leadId={open.id} companyId={companyId} />
            <Section title="Contact" f={[["Phone", open.caller_phone], ["Caller role", label(open.caller_role)], ["Existing customer", yn(open.existing_customer)], ["Callback consent", yn(open.consent_to_callback)]]} />
            <Section title="Location" f={[["Postcode", open.postcode], ["Address", open.full_address], ["Property type", label(open.property_type)]]} />
            <Section title="Issue" f={[["Category", label(open.service_category)], ["Summary", open.issue_summary], ["Preferred", [open.preferred_date, open.preferred_time].filter(Boolean).join(" ")]]} />
            <Section title="Flags" f={[["Active leak", yn(open.has_active_leak)], ["No heating", yn(open.no_heating)], ["No hot water", yn(open.no_hot_water)], ["Suspected gas leak", yn(open.suspected_gas_leak)], ["CO concern", yn(open.carbon_monoxide_concern)], ["Drainage blockage", yn(open.drainage_blockage)], ["Vulnerable occupant", yn(open.vulnerable_occupant)]]} />
            <Section title="Call" f={[["Call summary", open.call_summary], ["Recommended action", open.recommended_business_action], ["Routed company", companyName(open.company_id)], ["Received", fmtTime(open.created_at)]]} />
          </aside>
        </div>
      )}
    </div>
  );
}

const yn = (b?: boolean | null) => (b == null ? "—" : b ? "Yes" : "No");

function Section({ title, f }: { title: string; f: [string, string | null | undefined][] }) {
  return (
    <div className="mt-5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <dl className="mt-2 divide-y divide-border rounded-lg border border-border">
        {f.map(([k, v]) => (
          <div key={k} className="flex gap-3 px-3 py-2 text-sm">
            <dt className="w-36 shrink-0 text-muted-foreground">{k}</dt>
            <dd className="min-w-0 flex-1 whitespace-pre-wrap break-words">{v || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
