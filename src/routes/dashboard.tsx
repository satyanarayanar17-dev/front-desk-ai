import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { getSupabase, isOwnerEmail } from "@/lib/supabase";

export const Route = createFileRoute("/dashboard")({
  staticData: { sitemap: "exclude-subtree" },
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard — Callwoven" },
      { name: "description", content: "Internal operations dashboard for Callwoven leads, companies and pilots." },
      { property: "og:title", content: "Dashboard — Callwoven" },
      { property: "og:description", content: "Internal operations dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async ({ location }) => {
    const { data } = await getSupabase().auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
    const email = data.session.user.email ?? "";
    if (location.pathname === "/dashboard" || location.pathname === "/dashboard/") {
      // Owner lands on leads; company staff go to their own portal.
      if (isOwnerEmail(email)) throw redirect({ to: "/dashboard/leads" });
      const { data: mem } = await getSupabase()
        .from("company_memberships")
        .select("role")
        .eq("user_id", data.session.user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (mem?.role === "manager") throw redirect({ to: "/manager" });
      if (mem) throw redirect({ to: "/employee" });
    }
    return { email };
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  const { email } = Route.useRouteContext();
  const navigate = useNavigate();
  const signOut = async () => {
    await getSupabase().auth.signOut();
    navigate({ to: "/login", replace: true });
  };
  const tab = "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground";
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="text-sm font-bold tracking-tight">
            Callwoven <span className="font-medium text-muted-foreground">Ops</span>
          </Link>
          <nav className="flex gap-1">
            <Link to="/dashboard/leads" className={tab} activeProps={{ className: "bg-muted !text-foreground" }}>Leads</Link>
            <Link to="/dashboard/companies" className={tab} activeProps={{ className: "bg-muted !text-foreground" }}>Companies</Link>
            <Link to="/dashboard/pilots" className={tab} activeProps={{ className: "bg-muted !text-foreground" }}>Pilot interests</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>
            <button onClick={signOut} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {isOwnerEmail(email) ? (
          <Outlet />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <h1 className="text-lg font-semibold">Not authorised</h1>
            <p className="mt-2 text-sm text-muted-foreground">This account doesn't have access to the owner dashboard.</p>
          </div>
        )}
      </main>
    </div>
  );
}
