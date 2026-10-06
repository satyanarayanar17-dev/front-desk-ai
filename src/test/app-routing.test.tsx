import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const matches = router.matchRoutes("/");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("serves the owner dashboard sections", () => {
    for (const path of ["/dashboard", "/dashboard/leads", "/dashboard/pilots", "/dashboard/companies"]) {
      const matches = router.matchRoutes(path);
      expect(matches.at(-1)?.routeId, path).not.toBe(rootRouteId);
    }
  });

  it("serves the manager and team portals", () => {
    for (const path of ["/manager", "/manager/team", "/manager/settings", "/manager/history", "/employee"]) {
      const matches = router.matchRoutes(path);
      expect(matches.at(-1)?.routeId, path).not.toBe(rootRouteId);
    }
  });

  it("serves both logins and password replacement", () => {
    for (const path of ["/owner/login", "/client/login", "/change-password"]) {
      expect(router.matchRoutes(path).at(-1)?.routeId, path).not.toBe(rootRouteId);
    }
  });
  it("serves the call webhook route", () => {
    const matches = router.matchRoutes("/api/public/webhooks/vapi");
    expect(matches.at(-1)?.routeId, "/api/public/webhooks/vapi").not.toBe(rootRouteId);
  });
});
