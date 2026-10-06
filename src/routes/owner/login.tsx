import { createFileRoute } from "@tanstack/react-router";
import { PortalLogin } from "@/components/PortalLogin";

export const Route = createFileRoute("/owner/login")({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({
    meta: [
      { title: "Owner sign in — Callwoven" },
      { name: "description", content: "Sign-in for Callwoven platform owners." },
      { property: "og:title", content: "Owner sign in — Callwoven" },
      { property: "og:description", content: "Sign-in for Callwoven platform owners." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <PortalLogin kind="owner" />,
});
