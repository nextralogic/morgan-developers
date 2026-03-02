import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation("common");

  return (
    <footer className="border-t bg-card">
      <div className="container section-padding">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <h3 className="font-heading text-lg font-bold tracking-tight">
              {t("brand.name")}<span className="text-primary">.</span>
            </h3>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t("brand.tagline")}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("footer.quickLinks")}
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link to="/" className="text-foreground/70 transition-colors hover:text-primary">{t("nav.home")}</Link>
              </li>
              <li>
                <Link to="/properties" className="text-foreground/70 transition-colors hover:text-primary">{t("nav.properties")}</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("footer.contact")}
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li>{t("footer.contactItems.location")}</li>
              <li>{t("footer.contactItems.email")}</li>
              <li>{t("footer.contactItems.phone")}</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t">
        <div className="container py-5 text-center text-xs text-muted-foreground">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
