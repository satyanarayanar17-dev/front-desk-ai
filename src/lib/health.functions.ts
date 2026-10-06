import { createServerFn } from "@tanstack/react-start";

// Read-only GET against the public health endpoint (server-side avoids CORS).
export const checkWebhookHealth = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const res = await fetch("https://gtlfkvsqkxyktxqjgrbs.supabase.co/functions/v1/vapi-webhook", {
      method: "GET",
    });
    return { ok: res.ok, status: res.status, checkedAt: new Date().toISOString() };
  } catch {
    return { ok: false, status: 0, checkedAt: new Date().toISOString() };
  }
});
