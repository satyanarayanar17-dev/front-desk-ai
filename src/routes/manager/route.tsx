import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { getSupabase } from "@/lib/supabase";

export const Route = createFileRoute("/manager")({
  staticData: { sitemap: "exclude-subtree" },
  ssr: false,
  head: () => ({
    meta: [
      { title: "Manager portal — Callwoven" },
      { name: "description", content: "Manager portal for your company's calls, team and settings." },
      { property: "og:title", content: "Manager portal — Callwoven" },
      { property: "og:description", content: "Manager portal for your company's calls, team and settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await getSupabase().auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
    const userId = data.session.user.id;
    const email = data.session.user.email ?? "";
    const { data: mems } = await getSupabase()
      .from("company_memberships")
      .select("id, company_id, role, status")
      .eq("user_id", userId)
      .eq("status", "active");
    const membership = (mems ?? []).find((m) => m.role === "manager");
    if (!membership) {
      // Employee? Send to their portal. Otherwise the owner dashboard handles it.
      if ((mems ?? []).length > 0) throw redirect({ to: "/employee" });
      throw redirect({ to: "/dashboard" });
    }
    return { email, userId, companyId: membership.company_id as string };
  },
  component: ManagerLayout,
});

function ManagerLayout() {
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
            Callwoven <span className="font-medium text-muted-foreground">Manager</span>
          </Link>
          <nav className="flex gap-1">
            <Link to="/manager" className={tab} activeProps={{ className: "bg-muted !text-foreground" }} activeOptions={{ exact: true }}>Calls</Link>
            <Link to="/manager/team" className={tab} activeProps={{ className: "bg-muted !text-foreground" }}>Team</Link>
            <Link to="/manager/settings" className={tab} activeProps={{ className: "bg-muted !text-foreground" }}>Settings</Link>
            <Link to="/manager/history" className={tab} activeProps={{ className: "bg-muted !text-foreground" }}>History</Link>
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
        <Outlet />
      </main>
    </div>
  );
}
