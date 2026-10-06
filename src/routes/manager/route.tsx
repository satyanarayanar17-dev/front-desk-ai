import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { getSupabase } from "@/lib/supabase";
import { activeMembership, getPortalAccess, needsPasswordChange } from "@/lib/portal-access";

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
    const access = await getPortalAccess();
    if (!access) throw redirect({ to: "/client/login" });
    if (needsPasswordChange(access)) throw redirect({ to: "/change-password" });
    const membership = activeMembership(access, "manager");
    if (!membership) {
      if (activeMembership(access)) throw redirect({ to: "/employee" });
      throw redirect({ to: "/client/login" });
    }
    return { email: access.email, userId: access.userId, companyId: membership.company_id };
  },
  component: ManagerLayout,
});

function ManagerLayout() {
  const { email } = Route.useRouteContext();
  const navigate = useNavigate();
  const signOut = async () => {
    await getSupabase().auth.signOut();
    navigate({ to: "/client/login", replace: true });
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
            <Link to="/change-password" className="text-xs underline underline-offset-4">Change password</Link>
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
