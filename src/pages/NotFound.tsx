import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const { t } = useTranslation("common");
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <Navbar />
      <main className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <p className="font-heading text-7xl font-bold text-primary/20">404</p>
          <h1 className="mt-2 font-heading text-2xl font-bold">{t("notFound.title")}</h1>
          <p className="mt-2 max-w-sm text-muted-foreground">
            {t("notFound.description")}
          </p>
          <Button asChild variant="outline" className="mt-6 gap-2">
            <Link to="/"><ArrowLeft className="h-4 w-4" /> {t("buttons.backToHome")}</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default NotFound;
