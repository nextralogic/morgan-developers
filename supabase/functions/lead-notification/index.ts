import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const escapeHtml = (text: string) => String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Every value comes from the public enquiry form, so all of it is escaped.
function leadEmailHtml(summary: Record<string, string>): string {
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lead_id } = await req.json();
    if (!lead_id) {
      return new Response(JSON.stringify({ error: "lead_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Claim the lead and read it in one statement, so a lead sends at most one
    // notification however many times this function is called with its id.
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", lead_id)
      .is("notified_at", null)
      .select("*, properties(title, property_public_id)")
      .maybeSingle();

    if (leadErr || !lead) {
      if (leadErr) console.error("Lead fetch error:", leadErr);
      return new Response(JSON.stringify({ error: "Lead not found or already notified" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build notification summary (logged for now; email integration can be added)
    const property = lead.properties as { title: string; property_public_id: number } | null;
    const propertyInfo = property
      ? `${property.title} (#${property.property_public_id})`
      : "General Inquiry";

    const summary = {
      subject: `New Lead: ${propertyInfo}`,
      name: lead.name,
      email: lead.email,
      phone: lead.phone || "N/A",
      budget: lead.budget_range || "N/A",
      preferred_time: lead.preferred_contact_time || "N/A",
      message: lead.message || "",
      property: propertyInfo,
      created_at: lead.created_at,
    };

    // Emails the admin through Resend when the RESEND_API_KEY, FROM_EMAIL and ADMIN_EMAIL
    // secrets are set; otherwise the lead is only logged.
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.log("Lead notification:", JSON.stringify(summary));
    } else {
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
        return new Response(JSON.stringify({ error: "Email failed" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("Lead email sent:", lead_id);
    }

    // Anyone holding the public anon key can call this function, so the lead's details are not echoed back.
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Lead notification error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
