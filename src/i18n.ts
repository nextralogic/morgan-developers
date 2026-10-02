import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enCommon from "@/locales/en/common.json";
import enHome from "@/locales/en/home.json";
import enProperties from "@/locales/en/properties.json";
import enPropertyDetail from "@/locales/en/propertyDetail.json";
import enLead from "@/locales/en/lead.json";
import enAuth from "@/locales/en/auth.json";
import enOwner from "@/locales/en/owner.json";
import enAdmin from "@/locales/en/admin.json";
import enTools from "@/locales/en/tools.json";

export const SUPPORTED_LANGUAGES = ["en", "ne"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const resources = {
  en: {
    common: enCommon,
    home: enHome,
    properties: enProperties,
    propertyDetail: enPropertyDetail,
    lead: enLead,
    auth: enAuth,
    owner: enOwner,
    admin: enAdmin,
    tools: enTools,
  },
} as const;

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      supportedLngs: [...SUPPORTED_LANGUAGES],
      fallbackLng: "en",
      defaultNS: "common",
      ns: ["common", "home", "properties", "propertyDetail", "lead", "auth", "owner", "admin", "tools"],
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ["localStorage"],
        caches: ["localStorage"],
        lookupLocalStorage: "morgan_developers_lang",
      },
      react: {
        useSuspense: false,
      },
    });
}

/** Nepali strings are fetched on demand so English visitors do not download them. */
export async function loadLanguage(lng: AppLanguage): Promise<void> {
  if (lng === "en" || i18n.hasResourceBundle(lng, "common")) return;
  const { default: bundles } = await import("@/locales/ne");
  for (const [ns, data] of Object.entries(bundles)) {
    i18n.addResourceBundle(lng, ns, data, true, true);
  }
}

export async function setLanguage(lng: AppLanguage): Promise<void> {
  await loadLanguage(lng);
  await i18n.changeLanguage(lng);
}

const detectedLanguage = (i18n.language || "en").split("-")[0] as AppLanguage;
if (detectedLanguage !== "en" && SUPPORTED_LANGUAGES.includes(detectedLanguage)) {
  void setLanguage(detectedLanguage);
}

if (typeof document !== "undefined") {
  const initialLanguage = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  document.documentElement.lang = initialLanguage;

  i18n.on("languageChanged", (lng) => {
    document.documentElement.lang = lng.split("-")[0];
  });
}

export default i18n;
