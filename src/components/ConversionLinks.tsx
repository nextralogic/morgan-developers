import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CONVERSION_PAIRS, conversionPath, conversionSlug, type ConversionPair } from "@/lib/land-conversions";

interface ConversionLinksProps {
  title: string;
  current?: ConversionPair;
}

const ConversionLinks = ({ title, current }: ConversionLinksProps) => {
  const { t } = useTranslation("tools");
  const unitTitle = (pair: ConversionPair, side: "from" | "to") => t(`landConverter.units.${pair[side]}.title` as const);

  return (
    <section className="mt-12">
      <h2 className="font-heading text-xl font-semibold">{title}</h2>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {CONVERSION_PAIRS.filter((pair) => pair !== current).map((pair) => (
          <li key={conversionSlug(pair)}>
            <Link to={conversionPath(pair)} className="font-medium underline underline-offset-4 hover:text-primary">
              {t("landConverter.pair.breadcrumb", { from: unitTitle(pair, "from"), to: unitTitle(pair, "to") })}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ConversionLinks;
