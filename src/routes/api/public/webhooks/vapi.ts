import { createFileRoute } from "@tanstack/react-router";

/**
 * Vapi call webhook — updated for the multi-company platform.
 *
 * - Verifies the caller secret (header `x-vapi-secret`) when the shared
 *   secret is configured.
 * - Skips duplicate call events (same Vapi call id).
 * - Maps each call to a company via its assistant id or inbound phone
 *   number; unmapped calls are held for review and visible only to the
 *   platform owner until assigned.
 * - Internal identifiers keep the existing frontdesk_* names.
 */

type AnyRecord = Record<string, unknown>;

const str = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
};

const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);

// Tolerant extraction of structured fields across payload shapes.
const snakeize = (o: AnyRecord): AnyRecord => {
  const out: AnyRecord = {};
  for (const [k, v] of Object.entries(o)) out[k] = v;
  return out;
};

const pick = (o: unknown, path: string[]): unknown => {
  let cur = o;
  for (const key of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as AnyRecord)[key];
  }
  return cur;
};

const findStructuredOutputs = (p: unknown): AnyRecord | null => {
  const candidates = [
    pick(p, ["structuredOutputs"]),
    pick(p, ["message", "structuredOutputs"]),
    pick(p, ["artifact", "structuredOutputs"]),
    pick(p, ["call", "structuredOutputs"]),
  ];
  for (const c of candidates) {
    if (c && typeof c === "object" && Object.keys(c as AnyRecord).length) return c as AnyRecord;
  }
  return null;
};

const get = (p: unknown, path: string[]) => {
  const v = pick(p, path);
  return v == null ? null : v;
};

export const Route = createFileRoute("/api/public/webhooks/vapi")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => new Response(JSON.stringify({ ok: true, service: "vapi-webhook" }), { headers: { "Content-Type": "application/json" } }),
      POST: async ({ request }) => {
        // Verify the shared secret when configured.
        const expectedSecret = process.env["VAPI_WEBHOOK_SECRET"];
        if (expectedSecret) {
          const provided = request.headers.get("x-vapi-secret") ?? "";
          if (provided !== expectedSecret) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
          }
        } else {
          console.warn("vapi-webhook: VAPI_WEBHOOK_SECRET is not configured; accepting request without verification");
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        // Vapi nests details under `message`; merge it with the top level so
        // both flat and nested event shapes resolve the same way.
        const raw = body as AnyRecord;
        const msg = (raw["message"] && typeof raw["message"] === "object" ? raw["message"] : {}) as AnyRecord;
        const payload: AnyRecord = {
          ...msg,
          ...raw,
          call: { ...((msg["call"] as AnyRecord) ?? {}), ...((raw["call"] as AnyRecord) ?? {}) },
          customer: { ...((msg["customer"] as AnyRecord) ?? {}), ...((raw["customer"] as AnyRecord) ?? {}) },
        };
        const vapiCallId = str(get(payload, ["call", "id"])) ?? str(get(payload, ["id"]));
        const eventType = str(get(payload, ["type"])) ?? str(get(payload, ["message", "type"]));
        const assistantId = str(get(payload, ["assistant", "id"])) ?? str(get(payload, ["assistantId"])) ?? str(get(payload, ["call", "assistantId"]));

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Skip duplicate events for the same call.
        if (vapiCallId) {
          const { data: existing } = await supabaseAdmin
            .from("frontdesk_leads")
            .select("id")
            .eq("vapi_call_id", vapiCallId)
            .maybeSingle();
          if (existing) {
            return new Response(JSON.stringify({ status: "duplicate", id: existing.id }), { headers: { "Content-Type": "application/json" } });
          }
        }

        // Map the call to a company.
        let companyId: string | null = null;
        let matchReason: string | null = null;
        if (assistantId) {
          const { data: s } = await supabaseAdmin
            .from("company_settings")
            .select("company_id")
            .eq("assistant_id", assistantId)
            .maybeSingle();
          if (s) {
            companyId = s.company_id;
            matchReason = `assistant:${assistantId}`;
          }
        }
        if (!companyId) {
          const inboundNumber = str(get(body, ["call", "destinationPhone"])) ?? str(get(body, ["call", "toNumber"]));
          if (inboundNumber) {
            const { data: s } = await supabaseAdmin
              .from("company_settings")
              .select("company_id")
              .eq("inbound_phone_number", inboundNumber)
              .maybeSingle();
            if (s) {
              companyId = s.company_id;
              matchReason = `inbound_number:${inboundNumber}`;
            }
          }
        }

        const structured = findStructuredOutputs(body);
        const callerName = str(get(body, ["call", "customer", "name"]));
        const callerPhone = str(get(body, ["call", "customer", "number"]));

        // The DB stores snake_case; map from camelCase where present.
        const so: AnyRecord = structured ?? {};
        const g = (snake: string, camel: string): unknown => {
          if (so[snake] != null) return so[snake];
          if (so[camel] != null) return so[camel];
          return null;
        };

        const row: AnyRecord = {
          vapi_call_id: vapiCallId,
          event_type: eventType,
          assistant_id: assistantId,
          structured_output_name: str(get(body, ["structuredOutputName"])) ?? str(snakeize(so)["structured_output_name"]) ?? null,
          caller_name: callerName ?? (g("caller_name", "callerName") as string | null) ?? null,
          caller_phone: callerPhone ?? (g("caller_phone", "callerPhone") as string | null) ?? null,
          postcode: g("postcode", "postcode") as string | null,
          full_address: g("full_address", "fullAddress") as string | null,
          existing_customer: bool(g("existing_customer", "existingCustomer")),
          service_category: g("service_category", "serviceCategory") as string | null,
          issue_summary: g("issue_summary", "issueSummary") as string | null,
          urgency: g("urgency", "urgency") as string | null,
          property_type: g("property_type", "propertyType") as string | null,
          boiler_make_model: g("boiler_make_model", "boilerMakeModel") as string | null,
          boiler_error_code: g("boiler_error_code", "boilerErrorCode") as string | null,
          has_active_leak: bool(g("has_active_leak", "hasActiveLeak")),
          leak_contained: bool(g("leak_contained", "leakContained")),
          no_heating: bool(g("no_heating", "noHeating")),
          no_hot_water: bool(g("no_hot_water", "noHotWater")),
          suspected_gas_leak: bool(g("suspected_gas_leak", "suspectedGasLeak")),
          carbon_monoxide_concern: bool(g("carbon_monoxide_concern", "carbonMonoxideConcern")),
          drainage_blockage: bool(g("drainage_blockage", "drainageBlockage")),
          vulnerable_occupant: bool(g("vulnerable_occupant", "vulnerableOccupant")),
          vulnerable_occupant_notes: g("vulnerable_occupant_notes", "vulnerableOccupantNotes") as string | null,
          preferred_date: g("preferred_date", "preferredDate") as string | null,
          preferred_time: g("preferred_time", "preferredTime") as string | null,
          caller_role: g("caller_role", "callerRole") as string | null,
          consent_to_callback: bool(g("consent_to_callback", "consentToCallback")),
          call_summary: g("call_summary", "callSummary") as string | null,
          recommended_business_action: g("recommended_business_action", "recommendedBusinessAction") as string | null,
          status: "new",
          raw_payload: body,
          company_id: companyId,
          assignment_status: companyId ? "assigned" : "unmatched",
          match_reason: matchReason,
        };

        const { data, error } = await supabaseAdmin.from("frontdesk_leads").insert(row).select("id").single();
        if (error) {
          console.error("vapi-webhook: insert failed", error);
          return new Response(JSON.stringify({ error: "Insert failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
        }

        // Notify the platform owner for review of unmapped calls.
        return new Response(JSON.stringify({ status: companyId ? "assigned" : "unmatched", id: data.id }), { headers: { "Content-Type": "application/json" } });
      },
    },
  },
});
