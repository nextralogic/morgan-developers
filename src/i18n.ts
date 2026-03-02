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

import neCommon from "@/locales/ne/common.json";
import neHome from "@/locales/ne/home.json";
import neProperties from "@/locales/ne/properties.json";
import nePropertyDetail from "@/locales/ne/propertyDetail.json";
import neLead from "@/locales/ne/lead.json";
import neAuth from "@/locales/ne/auth.json";
import neOwner from "@/locales/ne/owner.json";
import neAdmin from "@/locales/ne/admin.json";

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
  },
  ne: {
    common: neCommon,
    home: neHome,
    properties: neProperties,
    propertyDetail: nePropertyDetail,
    lead: neLead,
    auth: neAuth,
    owner: neOwner,
    admin: neAdmin,
  },
} as const;

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      supportedLngs: [...SUPPORTED_LANGUAGES],
      fallbackLng: "ne",
      defaultNS: "common",
      ns: ["common", "home", "properties", "propertyDetail", "lead", "auth", "owner", "admin"],
      lng: "ne",
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

if (typeof document !== "undefined") {
  const initialLanguage = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  document.documentElement.lang = initialLanguage;

  i18n.on("languageChanged", (lng) => {
    document.documentElement.lang = lng.split("-")[0];
  });
}

export default i18n;
