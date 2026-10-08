/**
 * Validation and email formatting for enquiries from the public form. No
 * remote imports, so the tests can load it under Node as well as Deno.
 */

/** Longest value accepted for each field. The leads table enforces the same limits. */
export const LEAD_FIELD_LIMITS = {
  name: 200,
  email: 254,
  phone: 40,
  message: 5000,
  budget_range: 100,
  preferred_contact_time: 50,
} as const;

type LeadField = keyof typeof LEAD_FIELD_LIMITS;

export type LeadInput = Record<LeadField, string | null> & { property_id: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^@]+@[^@]+\.[^@]+$/;

/**
 * The enquiry fields from a request body, or null when one is missing, too
 * long or not a string. Anything else in the body (status, notes, ...) is
 * dropped, so a visitor can only set what the form asks for.
 */
export function parseLead(body: unknown): LeadInput | null {
  if (!body || typeof body !== "object") return null;
  const input = body as Record<string, unknown>;

  const lead = { property_id: null } as LeadInput;
  for (const [field, max] of Object.entries(LEAD_FIELD_LIMITS) as [LeadField, number][]) {
    const value = input[field];
    if (value == null || value === "") {
      lead[field] = null;
    } else if (typeof value === "string" && value.length <= max) {
      lead[field] = value;
    } else {
      return null;
    }
  }
  if (!lead.name?.trim() || !lead.email || !EMAIL.test(lead.email)) return null;

  const propertyId = input.property_id;
  if (propertyId != null && propertyId !== "") {
    if (typeof propertyId !== "string" || !UUID.test(propertyId)) return null;
    lead.property_id = propertyId;
  }
  return lead;
}

export interface LeadSummary {
  subject: string;
  property: string;
  name: string;
  email: string;
  phone: string;
  budget: string;
  preferred_time: string;
  message: string;
}

const escapeHtml = (text: string) => String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Every value comes from the public enquiry form, so all of it is escaped. */
export function leadEmailHtml(summary: LeadSummary): string {
  const rows = [
    ["Property", summary.property],
    ["Name", summary.name],
    ["Email", summary.email],
    ["Phone", summary.phone],
    ["Budget", summary.budget],
    ["Preferred time", summary.preferred_time],
  ].map(([label, value]) => `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>`);
  if (summary.message) {
    rows.push(`<p><strong>Message:</strong></p><p style="white-space:pre-wrap">${escapeHtml(summary.message)}</p>`);
  }
  return `<h2>${escapeHtml(summary.subject)}</h2>
${rows.join("\n")}
<p><a href="https://morgandevelopers.com/admin">Open the admin dashboard</a></p>`;
}
