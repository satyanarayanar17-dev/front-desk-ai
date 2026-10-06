import { createFileRoute, redirect } from "@tanstack/react-router";

// Owner home: companies, employee limits, feature controls, phone mapping and history live on the owner companies page.
export const Route = createFileRoute("/owner/dashboard")({
  staticData: { sitemap: false },
  ssr: false,
  beforeLoad: () => { throw redirect({ to: "/dashboard/companies", replace: true }); },
});
