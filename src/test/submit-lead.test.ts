import { describe, expect, it } from "vitest";
import { LEAD_FIELD_LIMITS, leadEmailHtml, parseLead } from "../../supabase/functions/submit-lead/lead.ts";

const VALID = {
  name: "Ram Sharma",
  email: "ram@example.com",
  phone: "9800000000",
  message: "Is this plot still available?",
  budget_range: "50 lakh",
  preferred_contact_time: "morning",
  property_id: "4b7c0e52-1f7e-4c55-9a3e-2f1d6c8b9a10",
};

describe("parseLead", () => {
  it("keeps only the form's fields", () => {
    const body = { ...VALID, status: "archived", notes: "fake", handled_by: VALID.property_id, turnstile_token: "t" };
    expect(parseLead(body)).toEqual(VALID);
  });

  it("stores empty optional fields as null", () => {
    expect(parseLead({ name: "Ram", email: "ram@example.com", phone: "", message: "", property_id: "" })).toEqual({
      name: "Ram",
      email: "ram@example.com",
      phone: null,
      message: null,
      budget_range: null,
      preferred_contact_time: null,
      property_id: null,
    });
  });

  it("rejects a missing name or a malformed email", () => {
    expect(parseLead({ ...VALID, name: "   " })).toBeNull();
    expect(parseLead({ ...VALID, email: "not-an-email" })).toBeNull();
    expect(parseLead({ ...VALID, email: undefined })).toBeNull();
  });

  it("accepts values up to each limit and rejects longer ones", () => {
    for (const [field, max] of Object.entries(LEAD_FIELD_LIMITS)) {
      if (field === "email") continue;
      expect(parseLead({ ...VALID, [field]: "x".repeat(max) })).not.toBeNull();
      expect(parseLead({ ...VALID, [field]: "x".repeat(max + 1) })).toBeNull();
    }
    const longEmail = `${"x".repeat(LEAD_FIELD_LIMITS.email - "@example.com".length + 1)}@example.com`;
    expect(parseLead({ ...VALID, email: longEmail })).toBeNull();
  });

  it("rejects values that are not strings and property ids that are not UUIDs", () => {
    expect(parseLead({ ...VALID, message: { text: "hi" } })).toBeNull();
    expect(parseLead({ ...VALID, property_id: "1; drop table leads" })).toBeNull();
    expect(parseLead(null)).toBeNull();
    expect(parseLead("name=Ram")).toBeNull();
  });
});

describe("leadEmailHtml", () => {
  it("escapes everything the visitor typed", () => {
    const html = leadEmailHtml({
      subject: "New Lead: General Inquiry",
      property: "General Inquiry",
      name: '<img src=x onerror="alert(1)">',
      email: "ram@example.com",
      phone: "N/A",
      budget: "N/A",
      preferred_time: "N/A",
      message: "<script>alert(1)</script>",
    });
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&#60;img src=x onerror=&#34;alert(1)&#34;&#62;");
  });
});
