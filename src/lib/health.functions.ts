/** Webhook health: same-origin fetch, so no CORS and no absolute URL needed. */
export async function checkWebhookHealth(): Promise<{ ok: boolean; status: number; checkedAt: string }> {
  try {
    const res = await fetch("/api/public/webhooks/vapi", { method: "GET" });
    return { ok: res.ok, status: res.status, checkedAt: new Date().toISOString() };
  } catch {
    return { ok: false, status: 0, checkedAt: new Date().toISOString() };
  }
}
