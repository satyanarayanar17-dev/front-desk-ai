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
  const [password, setPassword] = useState("");
  const [forgot, setForgot] = useState(false);
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
        const fits = dest === "/change-password" || kind === "any" || (kind === "owner" ? dest === "/owner/dashboard" : dest === "/manager" || dest === "/employee");
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
    try {
      const sb = getSupabase();
      if (forgot) {
        const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: `${window.location.origin}/dashboard/leads`,
        });
        if (error) throw error;
        setState("sent");
      } else {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) { setError("Email or password is incorrect, or sign-in is temporarily unavailable."); setState("idle"); return; }
        const access = await getPortalAccess();
        const dest = access && portalDestination(access);
        const fits = dest === "/change-password" || kind === "any" || (kind === "owner" ? access?.isOwner : !access?.isOwner);
        if (dest && fits) { setPassword(""); await navigate({ to: dest, replace: true }); }
        else { await sb.auth.signOut(); setPassword(""); setError("This account does not have access to this portal."); setState("idle"); }
      }
    } catch (error) { setError(friendlyError(error)); setState("idle"); }

  };

  const signOut = async () => { await getSupabase().auth.signOut(); sessionStorage.removeItem("callwoven-password-recovery"); setState("idle"); setDenied(""); };
  const c = copy[kind];

  return (
    <div className="callwoven-hero flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-background/80 bg-card/95 p-8 shadow-xl">
        <Link to="/" aria-label="Callwoven home"><Mark descriptor={c.descriptor} /></Link>
        <h1 className="mt-6 text-xl font-semibold">{forgot ? "Reset your password" : c.title}</h1>
        {state === "checking" ? <SmallLoader /> : state === "denied" ? (
          <div className="mt-3 space-y-4" role="alert">
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><strong>Access denied.</strong> {denied}</p>
            <div className="flex gap-2">
              {kind === "owner" ? <Button asChild variant="outline" className="rounded-full"><Link to="/client/login">Client login</Link></Button> : null}
              <Button onClick={signOut} className="rounded-full">Sign out</Button>
            </div>
          </div>
        ) : state === "sent" ? (
          <div className="mt-3 space-y-4"><p className="text-sm text-muted-foreground">If an account exists for <strong className="text-foreground">{email}</strong>, you’ll receive a password reset link.</p><Button variant="outline" onClick={() => { setForgot(false); setState("idle"); }}>Back to login</Button></div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">{forgot ? "Enter your login email to request a password reset link." : c.intro + " Sign in with your email and password."}</p>
            <label className="block text-sm font-medium" htmlFor="login-email">Email</label>
            <input id="login-email" aria-label="Email address" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
            {!forgot && <><label className="block text-sm font-medium" htmlFor="login-password">Password</label><input id="login-password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30" /></>}
            {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
            <Button type="submit" disabled={state === "sending"} className="h-11 w-full rounded-full">{state === "sending" ? (forgot ? "Sending…" : "Signing in…") : (forgot ? "Send reset link" : "Log in")}</Button>
            <button type="button" disabled={state === "sending"} className="block text-sm underline underline-offset-4 text-muted-foreground" onClick={() => { setForgot(!forgot); setError(null); setPassword(""); }}>{forgot ? "Back to login" : "Forgot password?"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
