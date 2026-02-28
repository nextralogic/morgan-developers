import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createLead } from "@/services/leadService";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

interface LeadFormProps {
  propertyId?: string;
}

const LeadForm = ({ propertyId }: LeadFormProps) => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    budget_range: "",
    preferred_contact_time: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createLead({
        ...form,
        property_id: propertyId || null,
      });
      setSubmitted(true);
      toast.success("Inquiry submitted! We'll be in touch soon.");
      setForm({ name: "", email: "", phone: "", message: "", budget_range: "", preferred_contact_time: "" });
    } catch {
      toast.error("Failed to submit inquiry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-primary mb-3" />
        <h3 className="font-heading text-lg font-semibold">Thank You!</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
          We've received your inquiry and will contact you soon.
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => setSubmitted(false)}>
          Send Another Inquiry
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="lead-name">Full Name *</Label>
          <Input id="lead-name" className="mt-1.5" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
        </div>
        <div>
          <Label htmlFor="lead-email">Email *</Label>
          <Input id="lead-email" className="mt-1.5" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="lead-phone">Phone</Label>
          <Input id="lead-phone" className="mt-1.5" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+977-..." />
        </div>
        <div>
          <Label htmlFor="lead-budget">Budget Range</Label>
          <Input id="lead-budget" className="mt-1.5" placeholder="e.g. 50L - 1Cr" value={form.budget_range} onChange={(e) => setForm({ ...form, budget_range: e.target.value })} />
        </div>
      </div>
      <div>
        <Label htmlFor="lead-contact-time">Preferred Contact Time</Label>
        <Select value={form.preferred_contact_time} onValueChange={(v) => setForm({ ...form, preferred_contact_time: v })}>
          <SelectTrigger id="lead-contact-time" className="mt-1.5">
            <SelectValue placeholder="Select a time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="morning">Morning (9AM - 12PM)</SelectItem>
            <SelectItem value="afternoon">Afternoon (12PM - 5PM)</SelectItem>
            <SelectItem value="evening">Evening (5PM - 8PM)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="lead-message">Message</Label>
        <Textarea id="lead-message" className="mt-1.5" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us what you're looking for..." />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Submitting..." : "Send Inquiry"}
      </Button>
    </form>
  );
};

export default LeadForm;
