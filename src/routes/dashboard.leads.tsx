import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLiveTable } from "@/hooks/use-live-table";
import { checkWebhookHealth } from "@/lib/health.functions";
import { friendlyError, fmtTime, getSupabase, label, LEAD_STATUSES, URGENCIES, type Company, type Lead } from "@/lib/supabase";

export const Route = createFileRoute("/dashboard/leads")({ staticData: { sitemap: false }, component: LeadsPage });

const urgencyClass = (u?: string | null) =>
  u === "emergency"
    ? "bg-destructive/10 text-destructive"
    : u === "urgent_same_day"
      ? "bg-brand-soft text-brand-ink"
      : "bg-muted text-muted-foreground";

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}>{children}</span>;
}

function LeadsPage() {
  const { rows, loading, error, realtime, reload, updateStatus } = useLiveTable<Lead>("frontdesk_leads");
  const health = useServerFn(checkWebhookHealth);
  const healthQ = useQuery({ queryKey: ["webhook-health"], queryFn: () => health(), refetchInterval: 120_000 });
  const [q, setQ] = useState("");
  const [fu, setFu] = useState("");
  const [fs, setFs] = useState("");
  const [fc, setFc] = useState("");
  const [fa, setFa] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    getSupabase().from("companies").select("*").order("name").then(({ data }) => setCompanies((data ?? []) as Company[]));
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(rows.map((r) => r.service_category).filter(Boolean))) as string[],
    [rows],
  );
  const filtered = rows.filter((r) => {
    if (fu && r.urgency !== fu) return false;
    if (fs && (r.status ?? "new") !== fs) return false;
    if (fc && r.service_category !== fc) return false;
    if (fa && (r.assignment_status ?? "unmatched") !== fa) return false;
    if (q) {
      const hay = [r.caller_name, r.caller_phone, r.postcode, r.issue_summary].join(" ").toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });
  const unmatchedCount = rows.filter((r) => (r.assignment_status ?? "unmatched") === "unmatched").length;
  const urgentCount = rows.filter((r) => r.urgency === "emergency" || r.urgency === "urgent_same_day" || r.status === "urgent").length;
  const callbackCount = rows.filter((r) => r.status === "callback_requested").length;
  const newest = rows[0]?.created_at;
  const open = rows.find((r) => r.id === openId);
  const sel = "rounded-md border border-input bg-card px-2.5 py-2 text-sm";

  const assign = async (leadId: string, companyId: string) => {
    setMsg(null);
    const { data: user } = await getSupabase().auth.getUser();
    const { error } = await getSupabase()
      .from("frontdesk_leads")
      .update({
        company_id: companyId,
        assignment_status: "assigned",
        assigned_at: new Date().toISOString(),
        assigned_by: user.user?.id ?? null,
        match_reason: "assigned_by_owner",
      })
      .eq("id", leadId);
    setMsg(error ? friendlyError(error) : "Lead assigned.");
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Leads</h1>
        <span className="text-xs text-muted-foreground">{realtime ? "Live updates on" : "Auto-refresh every 30s"}</span>
        <button onClick={reload} className="ml-auto rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted">Refresh</button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat title="Total leads" value={String(rows.length)} />
        <Stat title="Held for review" value={String(unmatchedCount)} />
        <Stat title="Urgent / emergency" value={String(urgentCount)} />
        <Stat title="Callback requested" value={String(callbackCount)} />
        <Stat
          title="Webhook health"
          value={healthQ.isLoading ? "Checking…" : healthQ.data?.ok ? "Healthy" : "Unreachable"}
          tone={healthQ.data?.ok ? "ok" : healthQ.isLoading ? undefined : "bad"}
          sub={healthQ.data ? `Checked ${fmtTime(healthQ.data.checkedAt)}` : undefined}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, postcode, issue" className={`${sel} min-w-0 flex-1 sm:max-w-xs`} />
        <select value={fu} onChange={(e) => setFu(e.target.value)} className={sel} aria-label="Urgency">
          <option value="">All urgency</option>
          {URGENCIES.map((u) => <option key={u} value={u}>{label(u)}</option>)}
        </select>
        <select value={fs} onChange={(e) => setFs(e.target.value)} className={sel} aria-label="Status">
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((u) => <option key={u} value={u}>{label(u)}</option>)}
        </select>
        <select value={fc} onChange={(e) => setFc(e.target.value)} className={sel} aria-label="Service category">
          <option value="">All categories</option>
          {categories.map((u) => <option key={u} value={u}>{label(u)}</option>)}
        </select>
        <select value={fa} onChange={(e) => setFa(e.target.value)} className={sel} aria-label="Assignment">
          <option value="">All assignments</option>
          <option value="unmatched">Held for review</option>
          <option value="assigned">Assigned</option>
        </select>
      </div>

      {(error || msg) && <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error || msg}</p>}

      {loading ? (
        <div className="mt-5 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-card" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {rows.length === 0 ? "No leads yet. Calls captured by the AI receptionist will appear here." : "No leads match these filters."}
        </div>
      ) : (
        <div className="mt-5 grid gap-2">
          {filtered.map((r) => (
            <button key={r.id} onClick={() => setOpenId(r.id)} className="rounded-xl border border-border bg-card p-4 text-left shadow-sm hover:border-ring">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={urgencyClass(r.urgency)}>{label(r.urgency)}</Badge>
                <span className="font-semibold">{r.caller_name || "Unknown caller"}</span>
                <span className="text-sm text-muted-foreground">{r.caller_phone || "—"} · {r.postcode || "—"}</span>
                {(r.assignment_status ?? "unmatched") === "unmatched" && <Badge className="bg-blush/40 text-brand-ink">Held for review</Badge>}
                <span className="ml-auto text-xs text-muted-foreground">{fmtTime(r.created_at)}</span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-sm">{r.issue_summary || "No issue summary"}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{label(r.service_category)}</span>
                <span>· Preferred: {[r.preferred_date, r.preferred_time].filter(Boolean).join(" ") || "—"}</span>
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
                <p className="mt-1 text-xs text-muted-foreground">
                  {(open.assignment_status ?? "unmatched") === "unmatched" ? "Held for review — not yet routed to a company." : "Routed to a company."}
                  {open.match_reason ? ` (${open.match_reason})` : ""}
                </p>
              </div>
              <button onClick={() => setOpenId(null)} className="rounded-md border border-border px-2.5 py-1 text-sm">Close</button>
            </div>

            {(open.assignment_status ?? "unmatched") === "unmatched" && (
              <label className="mt-4 block text-xs font-medium text-muted-foreground">
                Route to company
                <select
                  value=""
                  onChange={(e) => e.target.value && assign(open.id, e.target.value)}
                  className={`${sel} mt-1 block w-full`}
                >
                  <option value="">Choose a company…</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            )}

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
            {msg && <p className="mt-2 text-xs text-destructive">{msg}</p>}
            <Section title="Contact" f={[["Phone", open.caller_phone], ["Caller role", label(open.caller_role)], ["Existing customer", yn(open.existing_customer)], ["Callback consent", yn(open.consent_to_callback)]]} />
            <Section title="Location" f={[["Postcode", open.postcode], ["Address", open.full_address], ["Property type", label(open.property_type)]]} />
            <Section title="Issue" f={[["Category", label(open.service_category)], ["Summary", open.issue_summary], ["Preferred", [open.preferred_date, open.preferred_time].filter(Boolean).join(" ")]]} />
            <Section title="Boiler" f={[["Make / model", open.boiler_make_model], ["Error code", open.boiler_error_code]]} />
            <Section title="Flags" f={[["Active leak", yn(open.has_active_leak)], ["Leak contained", yn(open.leak_contained)], ["No heating", yn(open.no_heating)], ["No hot water", yn(open.no_hot_water)], ["Drainage blockage", yn(open.drainage_blockage)], ["Suspected gas leak", yn(open.suspected_gas_leak)], ["CO concern", yn(open.carbon_monoxide_concern)]]} />
            <Section title="Vulnerable occupant" f={[["Vulnerable occupant", yn(open.vulnerable_occupant)], ["Notes", open.vulnerable_occupant_notes]]} />
            <Section title="Call" f={[["Call summary", open.call_summary], ["Recommended action", open.recommended_business_action], ["Vapi call ID", open.vapi_call_id], ["Event type", open.event_type], ["Created", fmtTime(open.created_at)], ["Updated", fmtTime(open.updated_at)]]} />
            <details className="mt-5 rounded-lg border border-border">
              <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground">Debug / raw Vapi payload</summary>
              <pre className="max-h-96 overflow-auto bg-muted p-3 text-[11px]">{JSON.stringify(open.raw_payload ?? null, null, 2)}</pre>
            </details>
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

function Stat({ title, value, sub, tone }: { title: string; value: string; sub?: string | undefined; tone?: "ok" | "bad" | undefined }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className={`mt-1 text-lg font-semibold ${tone === "ok" ? "text-brand" : tone === "bad" ? "text-destructive" : ""}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
