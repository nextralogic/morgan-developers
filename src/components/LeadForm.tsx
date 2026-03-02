import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createLead } from "@/services/leadService";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface LeadFormProps {
  propertyId?: string;
}

const LeadForm = ({ propertyId }: LeadFormProps) => {
  const { t } = useTranslation("lead");
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
      toast.success(t("toast.success"));
      setForm({ name: "", email: "", phone: "", message: "", budget_range: "", preferred_contact_time: "" });
    } catch {
      toast.error(t("toast.error"));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-primary mb-3" />
        <h3 className="font-heading text-lg font-semibold">{t("success.title")}</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
          {t("success.description")}
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => setSubmitted(false)}>
          {t("success.sendAnother")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="lead-name">{t("form.fullNameLabel")}</Label>
          <Input id="lead-name" className="mt-1.5" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("form.fullNamePlaceholder")} />
        </div>
        <div>
          <Label htmlFor="lead-email">{t("form.emailLabel")}</Label>
          <Input id="lead-email" className="mt-1.5" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t("form.emailPlaceholder")} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="lead-phone">{t("form.phoneLabel")}</Label>
          <Input id="lead-phone" className="mt-1.5" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t("form.phonePlaceholder")} />
        </div>
        <div>
          <Label htmlFor="lead-budget">{t("form.budgetLabel")}</Label>
          <Input id="lead-budget" className="mt-1.5" placeholder={t("form.budgetPlaceholder")} value={form.budget_range} onChange={(e) => setForm({ ...form, budget_range: e.target.value })} />
        </div>
      </div>
      <div>
        <Label htmlFor="lead-contact-time">{t("form.preferredContactTimeLabel")}</Label>
        <Select value={form.preferred_contact_time} onValueChange={(v) => setForm({ ...form, preferred_contact_time: v })}>
          <SelectTrigger id="lead-contact-time" className="mt-1.5">
            <SelectValue placeholder={t("form.preferredContactTimePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="morning">{t("form.contactTime.morning")}</SelectItem>
            <SelectItem value="afternoon">{t("form.contactTime.afternoon")}</SelectItem>
            <SelectItem value="evening">{t("form.contactTime.evening")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="lead-message">{t("form.messageLabel")}</Label>
        <Textarea id="lead-message" className="mt-1.5" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder={t("form.messagePlaceholder")} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t("form.submitting") : t("form.submit")}
      </Button>
    </form>
  );
};

export default LeadForm;
