import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveTable } from "@/hooks/use-live-table";
import { fmtTime, label, PILOT_STATUSES, type PilotInterest } from "@/lib/supabase";

export const Route = createFileRoute("/dashboard/pilots")({ staticData: { sitemap: false }, component: PilotsPage });

function PilotsPage() {
  const { rows, loading, error, realtime, reload, updateStatus } = useLiveTable<PilotInterest>("frontdesk_pilot_interests");
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Pilot interests</h1>
        <span className="text-xs text-muted-foreground">
          {rows.length} total · {realtime ? "Live updates on" : "Auto-refresh every 30s"}
        </span>
        <button onClick={reload} className="ml-auto rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted">Refresh</button>
      </div>
      {(error || msg) && <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error || msg}</p>}
      {loading ? (
        <div className="mt-6 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-card" />)}</div>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No pilot submissions yet. New enquiries from the website form will appear here.
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {rows.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.business_name || "—"}</p>
                  <p className="text-sm text-muted-foreground">
                    {p.contact_name || "—"} · {p.city || "—"} · {label(p.calls_per_week)} calls/week
                  </p>
                  <p className="mt-1 text-sm">
                    {p.email && <a className="text-brand hover:underline" href={`mailto:${p.email}`}>{p.email}</a>}
                    {p.phone && <> · <a className="hover:underline" href={`tel:${p.phone}`}>{p.phone}</a></>}
                    {p.website && <> · <span className="text-muted-foreground">{p.website}</span></>}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs text-muted-foreground">{fmtTime(p.created_at)}</span>
                  <select
                    aria-label="Pilot status"
                    value={p.status ?? "new"}
                    onChange={async (e) => setMsg(await updateStatus(p.id, e.target.value))}
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                  >
                    {PILOT_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                  </select>
                </div>
              </div>
              {p.notes && <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{p.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
