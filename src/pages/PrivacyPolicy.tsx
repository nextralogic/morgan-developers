import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { buildPrivacyPolicyMeta, formatPolicyDate, PRIVACY_POLICY_UPDATED, privacyPolicySections } from "@/lib/privacy-policy";
import { usePageMeta } from "@/lib/seo/usePageMeta";
import { SITE_URL } from "@/lib/seo/constants";
import { BUSINESS } from "@/lib/seo/core";

const PrivacyPolicy = () => {
  const { t, i18n } = useTranslation("common");
  const isNepali = i18n.resolvedLanguage?.startsWith("ne") ?? false;

  usePageMeta(buildPrivacyPolicyMeta(SITE_URL));

  const sections = privacyPolicySections(BUSINESS.email);

  return (
    <>
      <Navbar />
      <main className="container page-padding max-w-3xl">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">{t("nav.home")}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{t("privacy.title")}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="font-heading">{t("privacy.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("privacy.updated", { date: formatPolicyDate(PRIVACY_POLICY_UPDATED, isNepali ? "ne-NP" : "en-US") })}
        </p>
        {isNepali && <p className="mt-4 rounded-lg bg-muted/50 p-4 text-sm">{t("privacy.englishOnly")}</p>}

        <div lang="en" className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-heading text-xl font-semibold">{section.heading}</h2>
              {section.paragraphs?.map((text) => (
                <p key={text} className="mt-3 leading-relaxed text-muted-foreground">
                  {text}
                </p>
              ))}
              {section.items && (
                <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {section.note && <p className="mt-3 leading-relaxed text-muted-foreground">{section.note}</p>}
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default PrivacyPolicy;
