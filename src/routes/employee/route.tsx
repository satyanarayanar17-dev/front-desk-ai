import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { getSupabase } from "@/lib/supabase";

export const Route = createFileRoute("/employee")({
  staticData: { sitemap: "exclude-subtree" },
  ssr: false,
  head: () => ({
    meta: [
      { title: "Team portal — Callwoven" },
      { name: "description", content: "Team portal for your company's calls." },
      { property: "og:title", content: "Team portal — Callwoven" },
      { property: "og:description", content: "Team portal for your company's calls." },
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
    const membership = (mems ?? [])[0];
    if (!membership) throw redirect({ to: "/dashboard" });
    return { email, userId, companyId: membership.company_id as string };
  },
  component: EmployeeLayout,
});

function EmployeeLayout() {
  const { email } = Route.useRouteContext();
  const navigate = useNavigate();
  const signOut = async () => {
    await getSupabase().auth.signOut();
    navigate({ to: "/login", replace: true });
  };
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="text-sm font-bold tracking-tight">
            Callwoven <span className="font-medium text-muted-foreground">Team</span>
          </Link>
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
