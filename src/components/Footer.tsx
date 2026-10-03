import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PRIVACY_POLICY_PATH } from "@/lib/seo/core";

const Footer = () => {
  const { t } = useTranslation("common");

  return (
    <footer className="border-t bg-card">
      <div className="container section-padding">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <p className="font-heading text-lg font-bold tracking-tight">
              {t("brand.name")}<span className="text-primary">.</span>
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t("brand.tagline")}
            </p>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("footer.quickLinks")}
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link to="/" className="text-foreground/70 transition-colors hover:text-primary">{t("nav.home")}</Link>
              </li>
              <li>
                <Link to="/properties" className="text-foreground/70 transition-colors hover:text-primary">{t("nav.properties")}</Link>
              </li>
              <li>
                <Link to="/land-unit-converter" className="text-foreground/70 transition-colors hover:text-primary">{t("nav.landConverter")}</Link>
              </li>
              <li>
                <Link to="/land-area-calculator" className="text-foreground/70 transition-colors hover:text-primary">{t("nav.areaCalculator")}</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("footer.contact")}
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li>{t("footer.contactItems.location")}</li>
              <li>{t("footer.contactItems.email")}</li>
              <li>{t("footer.contactItems.phone")}</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t">
        <div className="container flex flex-col items-center gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:justify-center sm:gap-4">
          <span>{t("footer.copyright", { year: new Date().getFullYear() })}</span>
          <Link to={PRIVACY_POLICY_PATH} className="transition-colors hover:text-primary">{t("footer.privacy")}</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
