import { useCallback, useEffect, useState } from "react";
import { friendlyError, getSupabase } from "@/lib/supabase";

/** Loads a table newest-first, subscribes to realtime changes, and polls every 30s as fallback. */
export function useLiveTable<T extends { id: string }>(table: string) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtime, setRealtime] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase()
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) setError(friendlyError(error));
    else {
      setError(null);
      setRows((data ?? []) as T[]);
    }
    setLoading(false);
  }, [table]);

  useEffect(() => {
    load();
    const sb = getSupabase();
    const channel = sb
      .channel(`live-${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => load())
      .subscribe((status) => setRealtime(status === "SUBSCRIBED"));
    const poll = setInterval(load, 30_000);
    return () => {
      clearInterval(poll);
      sb.removeChannel(channel);
    };
  }, [table, load]);

  const updateStatus = async (id: string, status: string) => {
    const prev = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    const { data, error } = await getSupabase().from(table).update({ status }).eq("id", id).select("id");
    if (error || !data?.length) {
      setRows(prev);
      return error ? friendlyError(error) : "Update was not permitted.";
    }
    return null;
  };

  return { rows, loading, error, realtime, reload: load, updateStatus };
}
