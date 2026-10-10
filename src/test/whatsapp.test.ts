import { describe, expect, it } from "vitest";
import { WHATSAPP_NUMBER, whatsappGreeting, whatsappUrl } from "@/lib/whatsapp";

describe("WhatsApp chat links", () => {
  it("uses a full international number, as wa.me requires", () => {
    // Country code first, digits only: no "+", spaces or leading 0.
    expect(WHATSAPP_NUMBER).toMatch(/^[1-9]\d{9,14}$/);
  });

  it("opens a chat with the message encoded", () => {
    expect(whatsappUrl("Hi Callwoven, demo & pricing?")).toBe(
      `https://wa.me/${WHATSAPP_NUMBER}?text=Hi%20Callwoven%2C%20demo%20%26%20pricing%3F`,
    );
  });

  it("tailors the greeting to the page being read", () => {
    expect(whatsappGreeting("/dental")).toContain("Callwoven Dental");
    expect(whatsappGreeting("/dental/")).toContain("Callwoven Dental");
    expect(whatsappGreeting("/demo")).toContain("arrange a demo");
    expect(whatsappGreeting("/")).toBe(
      "Hi Callwoven, I have a question about your AI receptionist.",
    );
    expect(whatsappGreeting("/privacy")).toBe(whatsappGreeting("/"));
  });
});
