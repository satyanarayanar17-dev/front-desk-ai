import { describe, expect, it } from "vitest";
import { portalDestination } from "@/lib/portal-access";

const m = (role: "manager" | "employee", status = "active") => ({ company_id: "c1", role, status });

describe("portalDestination", () => {
  it("sends owners to the owner dashboard", () => expect(portalDestination({ isOwner: true, memberships: [] })).toBe("/owner/dashboard"));
  it("sends active managers to the company dashboard", () => expect(portalDestination({ isOwner: false, memberships: [m("manager")] })).toBe("/manager"));
  it("sends active employees to their enquiries", () => expect(portalDestination({ isOwner: false, memberships: [m("employee")] })).toBe("/employee"));
  it("gives inactive members no portal", () => expect(portalDestination({ isOwner: false, memberships: [m("manager", "inactive")] })).toBeNull());
  it("gives users without membership no portal", () => expect(portalDestination({ isOwner: false, memberships: [] })).toBeNull());
});
