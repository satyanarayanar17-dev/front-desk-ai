import { createFileRoute } from "@tanstack/react-router";
import { PortalLogin } from "@/components/PortalLogin";

export const Route = createFileRoute("/client/login")({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({
    meta: [
      { title: "Client login — Callwoven" },
      { name: "description", content: "Sign-in for invited company managers and team members." },
      { property: "og:title", content: "Client login — Callwoven" },
      { property: "og:description", content: "Sign-in for invited company managers and team members." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <PortalLogin kind="client" />,
});
