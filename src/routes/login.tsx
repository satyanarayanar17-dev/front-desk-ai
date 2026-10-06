import { createFileRoute } from "@tanstack/react-router";
import { PortalLogin } from "@/components/PortalLogin";

export const Route = createFileRoute("/login")({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Callwoven" },
      { name: "description", content: "Sign in and continue to your Callwoven portal." },
      { property: "og:title", content: "Sign in — Callwoven" },
      { property: "og:description", content: "Sign in and continue to your Callwoven portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <PortalLogin kind="any" />,
});
