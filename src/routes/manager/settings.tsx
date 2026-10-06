import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { friendlyError, getSupabase, label, type CompanySettings } from "@/lib/supabase";
export const Route = createFileRoute("/manager/settings")({ staticData: { sitemap: false }, component: SettingsPage });
function SettingsPage() {
 const { companyId } = Route.useRouteContext();
 const [settings, setSettings] = useState<CompanySettings | null>(null);
 const [error, setError] = useState<string | null>(null);
 useEffect(() => { getSupabase().from("company_settings").select("*").eq("company_id", companyId).maybeSingle().then(({data,error}) => {if(error) setError(friendlyError(error)); else setSettings(data as CompanySettings | null);}); }, [companyId]);
 return <div><h1 className="text-xl font-semibold">Your plan and settings</h1><p className="mt-2 text-sm text-muted-foreground">Contact Callwoven to change your employee allowance, features or assigned number.</p>{error && <p role="alert">{error}</p>}{settings ? <dl className="mt-5 grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2">{[["Employee allowance", settings.seat_limit], ["Included minutes", settings.included_minutes], ["Assigned number", settings.inbound_phone_number || "Not assigned"], ...Object.entries(settings.features ?? {}).map(([k,v]) => [label(k), v ? "Enabled" : "Disabled"])].map(([k,v]) => <div key={String(k)}><dt className="text-sm text-muted-foreground">{k}</dt><dd className="mt-1 font-medium">{v}</dd></div>)}</dl> : <p className="mt-5 text-sm">Your settings are not available yet.</p>}</div>;
}
