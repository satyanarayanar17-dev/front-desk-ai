import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { friendlyError, getSupabase, label, type Company, type CompanySettings } from "@/lib/supabase";

export const Route = createFileRoute("/manager/settings")({ staticData: { sitemap: false }, component: SettingsPage });

const FEATURES = ["leads", "notes", "sms", "reports"] as const;

function SettingsPage() {
  const { companyId } = Route.useRouteContext();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const sel = "rounded-md border border-input bg-card px-2.5 py-2 text-sm";

  useEffect(() => {
    getSupabase().from("company_settings").select("*").eq("company_id", companyId).maybeSingle()
      .then(({ data }) => setSettings(data as CompanySettings | null));
    getSupabase().from("companies").select("*").eq("id", companyId).maybeSingle()
      .then(({ data }) => setCompany(data as Company | null));
  }, [companyId]);

  const update = async (patch: Partial<CompanySettings>) => {
    if (!settings) return;
    setMsg(null);
    const { error } = await getSupabase().from("company_settings").update(patch).eq("company_id", companyId);
    if (error) {
      setMsg(friendlyError(error));
      return;
    }
    setSettings({ ...settings, ...patch });
    setMsg("Saved.");
  };

  const routed = Boolean(settings?.assistant_id || settings?.inbound_phone_number);

  return (
    <div>
      <h1 className="text-xl font-semibold">Settings</h1>
      {msg && <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{msg}</p>}

      {!settings ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Your company isn't set up yet. The Callwoven team configures your account first — check back soon.
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-medium text-muted-foreground">
              Seat limit
              <input
                type="number"
                min={1}
                defaultValue={settings.seat_limit}
                onBlur={(e) => Number(e.target.value) !== settings.seat_limit && update({ seat_limit: Number(e.target.value) })}
                className={`${sel} mt-1 block w-full`}
              />
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Included minutes
              <input
                type="number"
                min={0}
                defaultValue={settings.included_minutes}
                onBlur={(e) => Number(e.target.value) !== settings.included_minutes && update({ included_minutes: Number(e.target.value) })}
                className={`${sel} mt-1 block w-full`}
              />
            </label>
          </div>

          <h2 className="mt-8 text-lg font-semibold">Call mapping</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Route calls to {company?.name ?? "your company"} by assistant ID or inbound phone number. This tells the receptionist webhook which company a call belongs to.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-medium text-muted-foreground">
              Vapi assistant ID
              <input
                defaultValue={settings.assistant_id ?? ""}
                onBlur={(e) => e.target.value !== (settings.assistant_id ?? "") && update({ assistant_id: e.target.value || null })}
                className={`${sel} mt-1 block w-full`}
              />
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Inbound phone number
              <input
                defaultValue={settings.inbound_phone_number ?? ""}
                onBlur={(e) => e.target.value !== (settings.inbound_phone_number ?? "") && update({ inbound_phone_number: e.target.value || null })}
                className={`${sel} mt-1 block w-full`}
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Call routing status: <strong>{label(settings.call_routing_status)}</strong>
          </p>

          <h2 className="mt-8 text-lg font-semibold">Features</h2>
          <div className="mt-3 space-y-2">
            {FEATURES.map((f) => (
              <label key={f} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--brand)]"
                  checked={Boolean(settings.features?.[f])}
                  onChange={(e) => update({ features: { ...settings.features, [f]: e.target.checked } })}
                />
                <span>{label(f)}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
