import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { friendlyError, getSupabase, isOwnerEmail } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Mark } from "@/components/Marketing";

export const Route = createFileRoute("/login")({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({
    meta: [
      { title: "Owner login — Callwoven" },
      { name: "description", content: "Owner sign-in for the Callwoven operations dashboard." },
      { property: "og:title", content: "Owner login — Callwoven" },
      { property: "og:description", content: "Owner sign-in for the Callwoven operations dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard/leads", replace: true });
    });
  }, [navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;
    setError(null);
    if (!isOwnerEmail(email)) {
      setError("This email isn't registered as an owner account.");
      return;
    }
    setState("sending");
    const { error } = await getSupabase().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/dashboard/leads`, shouldCreateUser: true },
    });
    if (error) {
      setError(friendlyError(error));
      setState("idle");
    } else setState("sent");
  };

  return (
    <div className="callwoven-hero flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-background/80 bg-card/95 p-8 shadow-xl">
        <Link to="/" aria-label="Callwoven home"><Mark descriptor="OPS" /></Link>
        <h1 className="mt-6 text-xl font-semibold">Owner sign-in</h1>
        {state === "sent" ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Check <strong className="text-foreground">{email}</strong> for a sign-in link. You can close this tab.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">We'll email you a one-time sign-in link.</p>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
            {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
            <Button
              type="submit"
              disabled={state === "sending"}
              className="h-11 w-full rounded-full"
            >
              {state === "sending" ? "Sending…" : "Send sign-in link"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
