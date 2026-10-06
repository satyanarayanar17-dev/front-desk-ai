import { createFileRoute } from "@tanstack/react-router";
import { useLiveTable } from "@/hooks/use-live-table";
import { fmtTime, type HistoryEntry } from "@/lib/supabase";

export const Route = createFileRoute("/manager/history")({ staticData: { sitemap: false }, component: HistoryPage });

function HistoryPage() {
  const { companyId } = Route.useRouteContext();
  const { rows, loading } = useLiveTable<HistoryEntry>("change_history");
  const mine = rows.filter((r) => r.company_id === companyId);

  return (
    <div>
      <h1 className="text-xl font-semibold">Change history</h1>
      <p className="mt-1 text-sm text-muted-foreground">Every change to your company's calls is recorded here.</p>
      {loading ? (
        <div className="mt-5 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-card" />)}</div>
      ) : mine.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No changes yet.
        </div>
      ) : (
        <div className="mt-5 grid gap-2">
          {mine.slice(0, 200).map((h) => (
            <div key={h.id} className="rounded-xl border border-border bg-card p-4 text-sm shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{`${h.table_name.replace(/_/g, " ")} · ${h.action}`}</span>
                <span className="ml-auto text-xs text-muted-foreground">{fmtTime(h.created_at)}</span>
              </div>
              {h.changes && (
                <dl className="mt-2 space-y-1">
                  {Object.entries(h.changes).map(([k, v]) => (
                    <div key={k} className="flex gap-2 text-xs">
                      <dt className="w-40 shrink-0 text-muted-foreground">{k.replace(/_/g, " ")}</dt>
                      <dd className="min-w-0 flex-1 break-words">{String(v).slice(0, 200)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
