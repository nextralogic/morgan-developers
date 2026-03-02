import "i18next";

import common from "@/locales/en/common.json";
import home from "@/locales/en/home.json";
import properties from "@/locales/en/properties.json";
import propertyDetail from "@/locales/en/propertyDetail.json";
import lead from "@/locales/en/lead.json";
import auth from "@/locales/en/auth.json";
import owner from "@/locales/en/owner.json";
import admin from "@/locales/en/admin.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: typeof common;
      home: typeof home;
      properties: typeof properties;
      propertyDetail: typeof propertyDetail;
      lead: typeof lead;
      auth: typeof auth;
      owner: typeof owner;
      admin: typeof admin;
    };
  }
}
