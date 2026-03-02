import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useTranslation } from "react-i18next";

const ResetPassword = () => {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    } else {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          setReady(true);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error(t("reset.errors.passwordMismatch"));
      return;
    }
    if (password.length < 6) {
      toast.error(t("reset.errors.passwordTooShort"));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(t("reset.errors.genericError"));
    } else {
      toast.success(t("reset.toasts.updated"));
      navigate("/");
    }
  };

  return (
    <>
      <Navbar />
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <Card className="w-full max-w-md rounded-xl shadow-lg">
          <CardHeader className="space-y-1 pb-2 text-center">
            <CardTitle className="font-heading text-2xl">{t("reset.title")}</CardTitle>
            <CardDescription>{t("reset.description")}</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-4 md:p-8 md:pt-4">
            {!ready ? (
              <p className="text-center text-sm text-muted-foreground">
                {t("reset.verifyingLink")}
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="password">{t("reset.newPasswordLabel")}</Label>
                  <Input id="password" className="mt-1.5" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("reset.passwordPlaceholder")} />
                </div>
                <div>
                  <Label htmlFor="confirm">{t("reset.confirmPasswordLabel")}</Label>
                  <Input id="confirm" className="mt-1.5" type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={t("reset.passwordPlaceholder")} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("reset.submitting") : t("reset.submit")}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </>
  );
};

export default ResetPassword;
