import { createClient } from "@supabase/supabase-js";
import { ANALYSIS_INSTRUCTIONS, ANALYSIS_MODEL, validateAnalysis } from "./transcript-analysis";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase";

type Runtime = { OPENAI_API_KEY?: string };
const nullableString = { type: ["string", "null"] };
const factFormat = { type: "object", additionalProperties: false, required: ["value", "evidence"], properties: { value: nullableString, evidence: nullableString } };
const outputFormat = {
  type: "json_schema",
  json_schema: { name: "call_enquiry_analysis", strict: true, schema: {
    type: "object", additionalProperties: false,
    required: ["summary", "followUpActions", "needs", "urgency", "budget", "timeline"],
    properties: {
      summary: { type: "string" }, followUpActions: { type: "array", items: { type: "string" } },
      needs: { type: "array", items: { type: "object", additionalProperties: false, required: ["need", "evidence"], properties: { need: { type: "string" }, evidence: { type: "string" } } } },
      urgency: { type: "object", additionalProperties: false, required: ["level", "reason", "evidence"], properties: { level: { type: "string", enum: ["routine", "urgent", "emergency", "unknown"] }, reason: { type: "string" }, evidence: nullableString } },
      budget: factFormat, timeline: factFormat,
    },
  } },
};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

// Token validation and RLS-scoped reads happen before any paid model call.
export async function handleCallAnalysis(request: Request, env: Runtime, fetcher: typeof fetch = fetch) {
  if (request.method !== "POST") return json(405, { error: "Use POST to analyse a transcript." });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json(403, { error: "This request must come from your Callwoven portal." });
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "Sign in to analyse a transcript." });
  const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { global: { headers: { Authorization: authorization }, fetch: fetcher }, auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { data: user, error: authError } = await sb.auth.getUser(authorization.slice(7));
    if (authError || !user.user) return json(401, { error: "Your session expired. Sign in again." });
    if (Number(request.headers.get("content-length") ?? 0) > 70000) return json(413, { error: "The transcript is too long." });
    const text = await request.text();
    if (text.length > 70000) return json(413, { error: "The transcript is too long." });
    let input: { leadId?: unknown; transcript?: unknown };
    try { input = JSON.parse(text); } catch { return json(400, { error: "Provide a valid transcript." }); }
    if (!input || typeof input.leadId !== "string" || !/^[0-9a-f-]{36}$/i.test(input.leadId) || typeof input.transcript !== "string" || input.transcript.trim().length < 20 || input.transcript.length > 16000) return json(400, { error: "Provide a call and a transcript between 20 and 16,000 characters." });
    const { data: lead, error: leadError } = await sb.from("frontdesk_leads").select("id,company_id").eq("id", input.leadId).maybeSingle();
    if (leadError || !lead?.company_id) return json(403, { error: "This call is not available to your company." });
    const { data: membership } = await sb.from("company_memberships").select("id").eq("company_id", lead.company_id).eq("user_id", user.user.id).eq("role", "manager").eq("status", "active").maybeSingle();
    const { data: settings } = await sb.from("company_settings").select("features").eq("company_id", lead.company_id).maybeSingle();
    if (!membership) return json(403, { error: "Only company managers can analyse transcripts." });
    if (settings?.features?.ai_analysis === false) return json(403, { error: "Transcript analysis is disabled for your company." });
    const key = env?.OPENAI_API_KEY;
    if (!key) return json(503, { error: "Transcript analysis is awaiting OpenAI setup. Contact Callwoven to enable it.", code: "openai_not_configured" });
    const { error: limitError } = await sb.rpc("reserve_transcript_analysis", { cid: lead.company_id });
    if (limitError?.code === "42501") return json(403, { error: "Your company access changed. Sign in again or contact Callwoven." });
    if (limitError) return json(limitError.code === "P0001" ? 429 : 502, { error: limitError.code === "P0001" ? "Analysis allowance reached. Try again later or contact Callwoven." : "Couldn't check your analysis allowance. Try again later." });
    const response = await fetcher("https://api.openai.com/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({ model: ANALYSIS_MODEL, temperature: 0.1, max_completion_tokens: 2500, store: false, response_format: outputFormat, messages: [{ role: "system", content: ANALYSIS_INSTRUCTIONS }, { role: "user", content: JSON.stringify({ callTranscript: input.transcript }) }] }),
    });
    if (response.status === 429) {
      const problem = await response.json().catch(() => null) as { error?: { code?: string } } | null;
      if (problem?.error?.code === "insufficient_quota") return json(503, { error: "OpenAI API credits are unavailable. Contact Callwoven." });
      return json(429, { error: "OpenAI is busy. Wait and try again." });
    }
    if (response.status === 401 || response.status === 403) return json(503, { error: "OpenAI API access needs attention. Contact Callwoven." });
    if (!response.ok) return json(502, { error: "OpenAI could not complete the analysis. Please try again later." });
    const payload = await response.json() as { choices?: { finish_reason?: string; message?: { content?: string; refusal?: string } }[] };
    const choice = payload.choices?.[0];
    if (choice?.message?.refusal) return json(422, { error: "OpenAI couldn't analyse this transcript. Review its contents and try again." });
    if (choice?.finish_reason === "length") return json(502, { error: "The analysis was cut short. Try a shorter transcript." });
    const content = choice?.message?.content;
    if (!content) return json(502, { error: "OpenAI returned no analysis." });
    let analysis;
    try { analysis = validateAnalysis(JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, "")), input.transcript); }
    catch { return json(502, { error: "The analysis was incomplete. Review the transcript and try again." }); }
    // Recheck access after generation: membership/features may change mid-request.
    const { data: current } = await sb.from("frontdesk_leads").select("id").eq("id", input.leadId).maybeSingle();
    const { data: active } = await sb.from("company_memberships").select("id").eq("company_id", lead.company_id).eq("user_id", user.user.id).eq("role", "manager").eq("status", "active").maybeSingle();
    const { data: finalSettings } = await sb.from("company_settings").select("features").eq("company_id", lead.company_id).maybeSingle();
    if (!current || !active || finalSettings?.features?.ai_analysis === false) return json(403, { error: "Your company access changed. Analysis was not saved." });
    return json(200, { analysis, model: ANALYSIS_MODEL });
  } catch (error) {
    if (error instanceof Error && /timeout|abort/i.test(error.name)) return json(504, { error: "Analysis took too long. Please try again." });
    return json(502, { error: "Analysis is temporarily unavailable. Please try again later." });
  }
}
