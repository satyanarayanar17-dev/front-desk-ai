import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase";
import { analysisSchema, type TranscriptAnalysis as Analysis } from "@/lib/transcript-analysis";

export function TranscriptAnalysis({ leadId, companyId, readOnly = false }: { leadId: string; companyId: string; readOnly?: boolean }) {
  const [transcript, setTranscript] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    getSupabase().from("call_analyses").select("transcript,analysis,model").eq("lead_id", leadId).maybeSingle().then(({data,error}) => {
      if (!alive.current) return;
      if (error) { setMessage("Couldn't load the saved analysis."); return; }
      const parsed = analysisSchema.safeParse(data?.analysis);
      if (data && parsed.success) { setTranscript(data.transcript); setAnalysis(parsed.data); setModel(data.model); setSaved(true); }
    });
    return () => { alive.current = false; controller.current?.abort(); };
  }, [leadId]);

  const analyse = async () => {
    if (busy) return;
    setBusy(true); setMessage(null); setAnalysis(null); setSaved(false);
    controller.current = new AbortController();
    try {
      const {data} = await getSupabase().auth.getSession();
      if (!data.session) throw new Error("Sign in again to analyse this call.");
      const response = await fetch("/api/call-analysis", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ leadId, transcript }), signal: controller.current.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Couldn't analyse the transcript.");
      if (alive.current) { setAnalysis(analysisSchema.parse(result.analysis)); setModel(result.model); }
    } catch (error) {
      if (alive.current) setMessage(error instanceof Error ? error.message : "Couldn't analyse the transcript.");
    } finally { if (alive.current) setBusy(false); }
  };
  const save = async () => {
    if (!analysis || saving) return;
    setSaving(true); setMessage(null);
    try {
      const {data: user} = await getSupabase().auth.getUser();
      if (!user.user) throw new Error("Sign in again to save the analysis.");
      const {data,error} = await getSupabase().from("call_analyses").upsert({ lead_id: leadId, company_id: companyId, transcript, analysis, model, created_by: user.user.id, updated_at: new Date().toISOString() }, { onConflict: "lead_id" }).select("lead_id");
      if (error || !data?.length) throw new Error("Couldn't save the analysis. Check your company access and try again.");
      if (alive.current) { setSaved(true); setMessage("Analysis saved for this call. No follow-up action was sent."); }
    } catch (error) { if (alive.current) setMessage(error instanceof Error ? error.message : "Couldn't save the analysis."); }
    finally { if (alive.current) setSaving(false); }
  };

  if (readOnly && !analysis) return message ? <p className="mt-5 text-sm" role="status">{message}</p> : null;
  return <section className="mt-6 rounded-xl border border-border bg-background p-4" aria-label="Transcript analysis">
    <h3 className="text-base font-semibold">{readOnly ? "Reviewed call analysis" : "Analyse a transcript"}</h3>
    {!readOnly && <><p className="mt-2 text-sm text-muted-foreground">Paste the conversation to generate an enquiry summary, suggested follow-up and caller requirements.</p>
      <label className="mt-3 block text-sm font-medium" htmlFor={`transcript-${leadId}`}>Call transcript</label>
      <textarea id={`transcript-${leadId}`} rows={7} maxLength={16000} value={transcript} onChange={e => {setTranscript(e.target.value); setAnalysis(null); setSaved(false); setMessage(null);}} disabled={busy || saving} className="mt-1 w-full resize-y rounded-lg border border-input bg-card p-3 text-sm" placeholder="Receptionist: How can we help?&#10;Caller: …" />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-muted-foreground">{transcript.length.toLocaleString()} / 16,000 characters</span><Button onClick={analyse} disabled={busy || saving || transcript.trim().length<20}>{busy ? "Analysing…" : "Analyse transcript"}</Button></div>
    </>}
    {message && <p className="mt-3 text-sm" role="status">{message}</p>}
    {analysis && <div className="mt-4 space-y-4" aria-live="polite">
      <div><h4 className="text-sm font-semibold">Enquiry summary</h4><p className="mt-1 whitespace-pre-wrap text-sm">{analysis.summary}</p></div>
      <div><h4 className="text-sm font-semibold">Caller needs</h4>{analysis.needs.length ? <ul className="mt-1 space-y-2">{analysis.needs.map((n,i) => <li key={i} className="text-sm">{n.need}<blockquote className="mt-1 border-l-2 border-powder pl-3 text-muted-foreground">“{n.evidence}”</blockquote></li>)}</ul> : <p className="text-sm">Not stated clearly.</p>}</div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="font-semibold">Urgency</dt><dd className="mt-1 capitalize">{analysis.urgency.level}</dd><dd className="mt-1 text-muted-foreground">{analysis.urgency.reason}</dd>{analysis.urgency.evidence && <dd className="mt-1">“{analysis.urgency.evidence}”</dd>}</div>
        {[['Budget',analysis.budget],['Timeline',analysis.timeline]].map(([title,f]) => {const fact=f as Analysis['budget']; return <div key={String(title)}><dt className="font-semibold">{title as string}</dt><dd className="mt-1">{fact.value ?? "Not stated"}</dd>{fact.evidence && <dd className="mt-1 text-muted-foreground">“{fact.evidence}”</dd>}</div>;})}
      </dl>
      <div><h4 className="text-sm font-semibold">Suggested follow-up</h4><ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">{analysis.followUpActions.map((a,i) => <li key={i}>{a}</li>)}</ol></div>
      <p className="text-sm text-muted-foreground">{saved ? "Saved after manager review." : "AI draft — check it against the transcript before saving."} Suggestions do not send messages, book appointments or change call priority.</p>
      {!readOnly && <Button variant="outline" onClick={save} disabled={saving || busy || saved}>{saving ? "Saving…" : saved ? "Saved" : "Save reviewed analysis"}</Button>}
    </div>}
  </section>;
}
