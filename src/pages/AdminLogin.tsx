import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield } from "lucide-react";
import { useTranslation } from "react-i18next";

const AdminLogin = () => {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(t("adminLogin.errors.genericError"));
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error(t("adminLogin.errors.authFailed"));
      setLoading(false);
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const hasAccess = (roles ?? []).some((r) =>
      ["super_admin", "admin", "moderator"].includes(r.role)
    );

    if (!hasAccess) {
      await supabase.auth.signOut();
      toast.error(t("adminLogin.errors.noAccess"));
      setLoading(false);
      return;
    }

    toast.success(t("adminLogin.toasts.welcomeBack"));
    navigate("/admin");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md rounded-xl shadow-lg">
        <CardHeader className="space-y-1 pb-2 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="font-heading text-2xl">{t("adminLogin.title")}</CardTitle>
          <CardDescription>{t("adminLogin.description")}</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-4 md:p-8 md:pt-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">{t("adminLogin.emailLabel")}</Label>
              <Input id="email" className="mt-1.5" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("adminLogin.emailPlaceholder")} />
            </div>
            <div>
              <Label htmlFor="password">{t("adminLogin.passwordLabel")}</Label>
              <Input id="password" className="mt-1.5" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("adminLogin.passwordPlaceholder")} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("adminLogin.submitting") : t("adminLogin.submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
