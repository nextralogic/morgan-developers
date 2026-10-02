import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const LandConverterCta = () => {
  const { t } = useTranslation("tools");

  return (
    <Card className="mt-12 rounded-xl bg-muted/30">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold">{t("landConverter.cta.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("landConverter.cta.text")}</p>
        </div>
        <Button asChild className="shrink-0 gap-2">
          <Link to="/properties">
            {t("landConverter.cta.button")} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default LandConverterCta;
