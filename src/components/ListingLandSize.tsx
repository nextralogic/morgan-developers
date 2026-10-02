import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AREA_UNITS, sqftToNepali, sqftToTerai, type AreaUnit } from "@/lib/area-utils";
import { conversionPath, converterPairForUnit } from "@/lib/land-conversions";
import { LAND_CONVERTER_PATH } from "@/lib/seo/core";

interface ListingLandSizeProps {
  sqft: number;
  /** The unit the size was entered in, used to pick the converter link. */
  unit: string | null;
}

const ListingLandSize = ({ sqft, unit }: ListingLandSizeProps) => {
  const { t, i18n } = useTranslation(["propertyDetail", "common"]);
  const numberLocale = i18n.resolvedLanguage?.startsWith("ne") ? "ne-NP" : "en-US";

  const format = (n: number, maxDigits = 2) => n.toLocaleString(numberLocale, { maximumFractionDigits: maxDigits });
  const hill = sqftToNepali(sqft);
  const terai = sqftToTerai(sqft);
  const pair = converterPairForUnit(unit);
  const unitKey = (unit && unit in AREA_UNITS ? unit : "sq_feet") as AreaUnit;

  const rows = [
    { label: t("size.sqft", { ns: "propertyDetail" }), value: format(sqft) },
    { label: t("size.sqm", { ns: "propertyDetail" }), value: format(sqft / AREA_UNITS.sq_meter.toSqft) },
    {
      label: t("size.hill", { ns: "propertyDetail" }),
      value: [hill.ropani, hill.anna, hill.paisa, hill.dam].map((n) => format(n, 0)).join("-"),
    },
    {
      label: t("size.terai", { ns: "propertyDetail" }),
      value: [format(terai.bigha, 0), format(terai.kattha, 0), format(terai.dhur)].join("-"),
    },
  ];

  return (
    <div>
      <h2 className="font-heading text-xl font-semibold">{t("size.title", { ns: "propertyDetail" })}</h2>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        {rows.map((row) => (
          <div key={row.label} className="rounded-lg border bg-muted/30 p-3">
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className="mt-1 font-heading font-semibold">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm">
        <Link
          to={pair ? conversionPath(pair) : LAND_CONVERTER_PATH}
          className="font-medium underline underline-offset-4 hover:text-primary"
        >
          {t("size.converter", { ns: "propertyDetail", unit: t(`areaUnits.${unitKey}` as const, { ns: "common" }) })}
        </Link>
      </p>
    </div>
  );
};

export default ListingLandSize;
