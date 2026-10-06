import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { friendlyError, getSupabase } from "@/lib/supabase";
import { getPortalAccess, portalDestination } from "@/lib/portal-access";
import { Button } from "@/components/ui/button";
import { Mark } from "@/components/Marketing";

export function SmallLoader({ label = "Checking access…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-blush border-t-brand" />
      {label}
    </div>
  );
}

type Kind = "owner" | "client" | "any";

const copy: Record<Kind, { title: string; intro: string; descriptor: string }> = {
  owner: { title: "Owner sign in", intro: "For Callwoven platform owners only.", descriptor: "OWNER" },
  client: { title: "Client sign in", intro: "For invited company managers and team members.", descriptor: "CLIENT" },
  any: { title: "Sign in", intro: "We'll send you to the right portal after checking your access.", descriptor: "OPS" },
};

export function PortalLogin({ kind }: { kind: Kind }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"checking" | "idle" | "sending" | "sent" | "denied">("checking");
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const access = await getPortalAccess();
        if (!alive) return;
        if (!access) return setState("idle");
        const dest = portalDestination(access);
        const fits = kind === "any" || (kind === "owner" ? dest === "/owner/dashboard" : dest === "/manager" || dest === "/employee");
        if (dest && fits) return void navigate({ to: dest, replace: true });
        setDenied(
          kind === "owner"
            ? dest
              ? "This sign-in is for Callwoven owners. Please use the client login for your company."
              : "This account does not have owner access."
            : dest === "/owner/dashboard"
              ? "This is the client login. Owners should use the owner sign-in page."
              : "This account has no active company membership. Ask your company manager to invite you, or check that your access hasn't been paused.",
        );
        setState("denied");
      } catch (e) {
        if (alive) { setError(friendlyError(e)); setState("idle"); }
      }
    })();
    return () => { alive = false; };
  }, [kind, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;
    setError(null);
    setState("sending");
    const path = kind === "owner" ? "/owner/login" : kind === "client" ? "/client/login" : "/login";
    const { error } = await getSupabase().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      // No public account creation: only existing owners and invited members can sign in.
      options: { emailRedirectTo: `${window.location.origin}${path}`, shouldCreateUser: false },
    });
    if (error) { setError(friendlyError(error)); setState("idle"); } else setState("sent");
  };

  const signOut = async () => { await getSupabase().auth.signOut(); setState("idle"); setDenied(""); };
  const c = copy[kind];

  return (
    <div className="callwoven-hero flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-background/80 bg-card/95 p-8 shadow-xl">
        <Link to="/" aria-label="Callwoven home"><Mark descriptor={c.descriptor} /></Link>
        <h1 className="mt-6 text-xl font-semibold">{c.title}</h1>
        {state === "checking" ? <SmallLoader /> : state === "denied" ? (
          <div className="mt-3 space-y-4" role="alert">
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><strong>Access denied.</strong> {denied}</p>
            <div className="flex gap-2">
              {kind === "owner" ? <Button asChild variant="outline" className="rounded-full"><Link to="/client/login">Client login</Link></Button> : null}
              <Button onClick={signOut} className="rounded-full">Sign out</Button>
            </div>
          </div>
        ) : state === "sent" ? (
          <p className="mt-3 text-sm text-muted-foreground">If <strong className="text-foreground">{email}</strong> has access, a sign-in link is on its way.</p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">{c.intro} We'll email you a one-time sign-in link.</p>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
            {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
            <Button type="submit" disabled={state === "sending"} className="h-11 w-full rounded-full">{state === "sending" ? "Sending…" : "Send sign-in link"}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
