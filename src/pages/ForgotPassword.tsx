import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

const ForgotPassword = () => {
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(t("login.toasts.genericError"));
    } else {
      setSent(true);
    }
  };

  return (
    <>
      <Navbar />
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <Card className="w-full max-w-md rounded-xl shadow-lg">
          <CardHeader className="space-y-1 pb-2 text-center">
            <CardTitle className="font-heading text-2xl">{t("forgot.title")}</CardTitle>
            <CardDescription>{t("forgot.description")}</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-4 md:p-8 md:pt-4">
            {sent ? (
              <div className="space-y-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("forgot.sentMessage")}
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/login">{t("forgot.backToSignIn")}</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">{t("forgot.emailLabel")}</Label>
                  <Input id="email" className="mt-1.5" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("forgot.emailPlaceholder")} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("forgot.submitting") : t("forgot.submit")}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <Link to="/login" className="font-medium text-primary hover:underline">{t("forgot.backToSignIn")}</Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </>
  );
};

export default ForgotPassword;
