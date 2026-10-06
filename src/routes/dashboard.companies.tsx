import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useLiveTable } from "@/hooks/use-live-table";
import { fmtTime, getSupabase, label, type Company, type CompanySettings } from "@/lib/supabase";

export const Route = createFileRoute("/dashboard/companies")({ staticData: { sitemap: false }, component: CompaniesPage });

const FEATURES = ["leads", "notes", "sms", "reports"] as const;
const COMPANY_STATUSES = ["pilot", "active", "paused", "cancelled"] as const;

type CompanyRow = Company & { settings: CompanySettings | null };

function CompaniesPage() {
  const { rows: settingsRows, reload } = useLiveTable<CompanySettings>("company_settings");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    getSupabase().from("companies").select("*").order("created_at", { ascending: false }).then(({ data }) => setCompanies((data ?? []) as Company[]));
  }, []);

  const rows: CompanyRow[] = companies.map((c) => ({ ...c, settings: settingsRows.find((s) => s.company_id === c.id) ?? null }));
  const open = rows.find((r) => r.id === openId);
  const sel = "rounded-md border border-input bg-card px-2.5 py-2 text-sm";

  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMsg(null);
    const name = String(fd.get("name") ?? "").trim();
    const slug = String(fd.get("slug") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    const contact_email = String(fd.get("email") ?? "").trim() || null;
    if (!name || !slug) {
      setMsg("Company name and a URL-safe slug are required.");
      return;
    }
    const { data: company, error } = await getSupabase()
      .from("companies")
      .insert({ name, slug, contact_email })
      .select("id")
      .single();
    if (error) {
      setMsg(error.message.includes("duplicate") ? "That slug is already taken." : `Couldn't create company: ${error.message}`);
      return;
    }
    const { error: sErr } = await getSupabase().from("company_settings").insert({ company_id: company.id });
    if (sErr) {
      setMsg(`Company created but settings row failed: ${sErr.message}`);
      return;
    }
    setMsg(`Created ${name}.`);
    e.currentTarget.reset();
    reload();
  };

  const updateCompany = async (id: string, patch: Partial<Company>) => {
    setMsg(null);
    const { error } = await getSupabase().from("companies").update(patch).eq("id", id);
    setMsg(error ? `Couldn't update company: ${error.message}` : "Saved.");
    reload();
  };

  const updateSettings = async (companyId: string, patch: Partial<CompanySettings>) => {
    setMsg(null);
    const { error } = await getSupabase().from("company_settings").update(patch).eq("company_id", companyId);
    setMsg(error ? `Couldn't update settings: ${error.message}` : "Saved.");
    reload();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Companies</h1>
        <span className="text-xs text-muted-foreground">{rows.length} total</span>
      </div>
      {msg && <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{msg}</p>}

      <form onSubmit={create} className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <label className="text-xs font-medium text-muted-foreground">
          Name
          <input name="name" required className={`${sel} mt-1 block`} placeholder="Bright Smile Dental" />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Slug
          <input name="slug" required className={`${sel} mt-1 block`} placeholder="bright-smile-dental" />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Contact email
          <input name="email" type="email" className={`${sel} mt-1 block`} placeholder="admin@business.co.uk" />
        </label>
        <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Add company</button>
      </form>

      {rows.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No companies yet. Add your first company above.
        </div>
      ) : (
        <div className="mt-5 grid gap-2">
          {rows.map((c) => (
            <button key={c.id} onClick={() => setOpenId(c.id)} className="rounded-xl border border-border bg-card p-4 text-left shadow-sm hover:border-ring">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{c.name}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">{label(c.status)}</span>
                <span className="text-xs text-muted-foreground">/{c.slug}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {c.settings ? `${c.settings.seat_limit} seats · ${c.settings.included_minutes} min · ${label(c.settings.call_routing_status)}` : "No settings"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Mapping: {c.settings?.assistant_id || "no assistant"} · {c.settings?.inbound_phone_number || "no inbound number"}
              </p>
            </button>
          ))}
        </div>
      )}

      {open && open.settings && (
        <div className="fixed inset-0 z-50 flex justify-end bg-foreground/30" onClick={() => setOpenId(null)}>
          <aside className="h-full w-full max-w-xl overflow-y-auto bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <h2 className="flex-1 text-lg font-semibold">{open.name}</h2>
              <button onClick={() => setOpenId(null)} className="rounded-md border border-border px-2.5 py-1 text-sm">Close</button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Created {fmtTime(open.created_at)} · /{open.slug}</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-medium text-muted-foreground">
                Status
                <select
                  value={open.status}
                  onChange={(e) => updateCompany(open.id, { status: e.target.value })}
                  className={`${sel} mt-1 block w-full`}
                >
                  {COMPANY_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                </select>
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Contact email
                <input
                  defaultValue={open.contact_email ?? ""}
                  onBlur={(e) => e.target.value !== (open.contact_email ?? "") && updateCompany(open.id, { contact_email: e.target.value || null })}
                  className={`${sel} mt-1 block w-full`}
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Seat limit
                <input
                  type="number"
                  min={1}
                  defaultValue={open.settings.seat_limit}
                  onBlur={(e) => Number(e.target.value) !== open.settings!.seat_limit && updateSettings(open.id, { seat_limit: Number(e.target.value) })}
                  className={`${sel} mt-1 block w-full`}
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Included minutes
                <input
                  type="number"
                  min={0}
                  defaultValue={open.settings.included_minutes}
                  onBlur={(e) => Number(e.target.value) !== open.settings!.included_minutes && updateSettings(open.id, { included_minutes: Number(e.target.value) })}
                  className={`${sel} mt-1 block w-full`}
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Vapi assistant ID (maps calls to this company)
                <input
                  defaultValue={open.settings.assistant_id ?? ""}
                  onBlur={(e) => e.target.value !== (open.settings!.assistant_id ?? "") && updateSettings(open.id, { assistant_id: e.target.value || null })}
                  className={`${sel} mt-1 block w-full`}
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Inbound phone number
                <input
                  defaultValue={open.settings.inbound_phone_number ?? ""}
                  onBlur={(e) => e.target.value !== (open.settings!.inbound_phone_number ?? "") && updateSettings(open.id, { inbound_phone_number: e.target.value || null })}
                  className={`${sel} mt-1 block w-full`}
                />
              </label>
            </div>

            <fieldset className="mt-5">
              <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Feature switches</legend>
              <div className="mt-2 space-y-2">
                {FEATURES.map((f) => (
                  <label key={f} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--brand)]"
                      checked={Boolean(open.settings!.features?.[f])}
                      onChange={(e) => updateSettings(open.id, { features: { ...open.settings!.features, [f]: e.target.checked } })}
                    />
                    <span>{label(f)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="mt-4 text-xs text-muted-foreground">
              Call routing status: <strong>{label(open.settings.call_routing_status)}</strong> — becomes "Mapped" once the webhook can match an assistant or inbound number above.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
