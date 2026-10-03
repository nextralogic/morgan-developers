import { describe, expect, it } from "vitest";
import { buildPrivacyPolicyMeta, formatPolicyDate, privacyPolicySections } from "@/lib/privacy-policy";
import { renderPrivacyPolicyContent } from "../../netlify/lib/page-content.ts";

describe("privacy policy", () => {
  it("builds indexable meta with a canonical URL and breadcrumb", () => {
    const meta = buildPrivacyPolicyMeta("https://example.com");
    expect(meta.title).toBe("Privacy Policy | Morgan Developers");
    expect(meta.canonical).toBe("https://example.com/privacy-policy");
    expect(meta.robots).toBeUndefined();
    expect(meta.description?.length).toBeLessThanOrEqual(160);
    expect(JSON.stringify(meta.jsonLd)).toContain("BreadcrumbList");
  });

  it("puts the contact email in the policy", () => {
    const text = JSON.stringify(privacyPolicySections("hello@example.com"));
    expect(text).toContain("hello@example.com");
  });

  it("formats the update date without shifting the day", () => {
    expect(formatPolicyDate("2026-10-03")).toBe("October 3, 2026");
  });

  it("renders crawlable HTML with every section heading", () => {
    const html = renderPrivacyPolicyContent();
    expect(html).toContain("<h1>Privacy Policy</h1>");
    for (const section of privacyPolicySections("x")) expect(html).toContain(`<h2>${section.heading}</h2>`);
    expect(html).toContain("Google sign-in");
    expect(html).not.toContain("<script");
  });
});
