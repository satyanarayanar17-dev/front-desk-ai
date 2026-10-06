import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { friendlyError, getSupabase } from "@/lib/supabase";

/**
 * Loads a table newest-first, subscribes to realtime changes, and polls every
 * 30s as fallback. The table name is a runtime string, so a loose-typed client
 * is used here — access is still enforced by RLS in the database.
 */
export function useLiveTable<T extends { id: string }>(table: string, scope?: { companyId: string; employeeId?: string }) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtime, setRealtime] = useState(false);

  const client = getSupabase() as unknown as SupabaseClient;

  const load = useCallback(async () => {
    let query = client.from(table).select("*");
    if (scope?.companyId) query = query.eq("company_id", scope.companyId);
    if (scope?.employeeId) query = query.eq("assigned_employee_id", scope.employeeId);
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) { setError(friendlyError(error)); setRows([]); }
    else {
      setError(null);
      setRows((data ?? []) as unknown as T[]);
    }
    setLoading(false);
  }, [client, table, scope?.companyId, scope?.employeeId]);

  useEffect(() => {
    load();
    const channel = client
      .channel(`live-${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => load())
      .subscribe((status) => setRealtime(status === "SUBSCRIBED"));
    const poll = setInterval(load, 30_000);
    return () => {
      clearInterval(poll);
      client.removeChannel(channel);
    };
  }, [client, table, load]);

  const updateStatus = async (id: string, status: string) => {
    const prev = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    const { data, error } = await client.from(table).update({ status }).eq("id", id).select("id");
    if (error || !data?.length) {
      setRows(prev);
      return error ? friendlyError(error) : "Update was not permitted.";
    }
    return null;
  };

  return { rows, loading, error, realtime, reload: load, updateStatus };
}
