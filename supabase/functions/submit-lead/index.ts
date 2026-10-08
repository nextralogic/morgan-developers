import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { leadEmailHtml, parseLead, type LeadInput } from "./lead.ts";

/**
 * The only way an enquiry reaches the leads table: checks the form's Cloudflare
 * Turnstile token, saves the lead with the service key, then emails the admin.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Until the TURNSTILE_SECRET_KEY secret is set the check is skipped, so the
 * form keeps working while the Turnstile keys are being set up.
 */
async function passesTurnstile(token: unknown): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) {
    console.warn("TURNSTILE_SECRET_KEY is not set, so this enquiry was accepted without a CAPTCHA check.");
    return true;
  }
  if (typeof token !== "string" || !token) return false;
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret, response: token }),
  });
  const result = await res.json();
  return result.success === true;
}

type Supabase = ReturnType<typeof createClient>;
type PropertyRef = { title: string; property_public_id: number } | null;

/**
 * Emails the admin through Resend when the RESEND_API_KEY, FROM_EMAIL and
 * ADMIN_EMAIL secrets are set; otherwise the lead is only logged. The lead is
 * already saved, so a failed email is logged rather than reported to the visitor.
 */
async function notifyAdmin(supabase: Supabase, leadId: string, lead: LeadInput, property: PropertyRef) {
  const propertyInfo = property ? `${property.title} (#${property.property_public_id})` : "General Inquiry";
  const summary = {
    subject: `New Lead: ${propertyInfo}`,
    property: propertyInfo,
    name: lead.name ?? "",
    email: lead.email ?? "",
    phone: lead.phone || "N/A",
    budget: lead.budget_range || "N/A",
    preferred_time: lead.preferred_contact_time || "N/A",
    message: lead.message || "",
  };

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.log("Lead notification:", JSON.stringify(summary));
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("FROM_EMAIL"),
      to: [Deno.env.get("ADMIN_EMAIL")],
      reply_to: summary.email,
      subject: summary.subject,
      html: leadEmailHtml(summary),
    }),
  });
  if (!res.ok) {
    console.error("Lead email failed:", res.status, await res.text());
    return;
  }
  await supabase.from("leads").update({ notified_at: new Date().toISOString() }).eq("id", leadId);
  console.log("Lead email sent:", leadId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const lead = parseLead(body);
    if (!lead) return json({ error: "Invalid enquiry" }, 400);
    if (!(await passesTurnstile(body.turnstile_token))) return json({ error: "Verification failed" }, 403);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: saved, error: insertErr } = await supabase
      .from("leads")
      .insert({ ...lead, source: "website" })
      .select("id, properties(title, property_public_id)")
      .single();
    if (insertErr || !saved) {
      console.error("Lead insert error:", insertErr);
      return json({ error: "Could not save the enquiry" }, 500);
    }

    await notifyAdmin(supabase, saved.id, lead, saved.properties as PropertyRef);

    // Anyone can call this function, so the lead's details are not echoed back.
    return json({ ok: true }, 200);
  } catch (error) {
    console.error("Submit lead error:", error);
    return json({ error: "Internal error" }, 500);
  }
});
