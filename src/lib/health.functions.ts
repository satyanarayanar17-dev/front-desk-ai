import { createServerFn } from "@tanstack/react-start";

// Health check runs server-side (avoids CORS) against the app's own webhook
// route. The webhook is served by this same app, so the check reads the
// route's own deployed URL.
export const checkWebhookHealth = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const origin = process.env.LOVABLE_PREVIEW_URL ?? process.env.PUBLIC_SITE_URL ?? "";
    const res = await fetch(`${origin}/api/public/webhooks/vapi`, { method: "GET" });
    return { ok: res.ok, status: res.status, checkedAt: new Date().toISOString() };
  } catch {
    return { ok: false, status: 0, checkedAt: new Date().toISOString() };
  }
});
