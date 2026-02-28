import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Fetch lead + property
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("*, properties(title, property_public_id)")
      .eq("id", lead_id)
      .single();

    if (leadErr || !lead) {
      console.error("Lead fetch error:", leadErr);
      return new Response(JSON.stringify({ error: "Lead not found" }), {
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

    // Log the notification (admin email sending can be wired up here)
    // To enable email: add ADMIN_EMAIL and FROM_EMAIL secrets, then integrate with
    // a mail provider (e.g. Resend) using the pattern below:
    //
    // const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    // await resend.emails.send({
    //   from: Deno.env.get("FROM_EMAIL") || "noreply@morgandevelopers.com",
    //   to: [Deno.env.get("ADMIN_EMAIL") || "leads@morgandevelopers.com"],
    //   subject: summary.subject,
    //   html: `<h2>${summary.subject}</h2>
    //     <p><strong>Name:</strong> ${summary.name}</p>
    //     <p><strong>Email:</strong> ${summary.email}</p>
    //     <p><strong>Phone:</strong> ${summary.phone}</p>
    //     <p><strong>Budget:</strong> ${summary.budget}</p>
    //     <p><strong>Preferred Time:</strong> ${summary.preferred_time}</p>
    //     <p><strong>Message:</strong> ${summary.message}</p>`,
    // });

    console.log("Lead notification:", JSON.stringify(summary));

    return new Response(JSON.stringify({ ok: true, summary }), {
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
