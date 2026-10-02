import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LandAreaConverter from "@/components/LandAreaConverter";
import ConversionLinks from "@/components/ConversionLinks";
import LandConverterCta from "@/components/LandConverterCta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { AreaUnit } from "@/lib/area-utils";
import {
  buildLandConversionMeta,
  conversionFactor,
  exampleAmount,
  findConversionPair,
  formatConverted,
  type ConversionPair,
} from "@/lib/land-conversions";
import { usePageMeta } from "@/lib/seo/usePageMeta";
import { SITE_URL } from "@/lib/seo/constants";
import { LAND_CONVERTER_PATH } from "@/lib/seo/core";
import NotFound from "./NotFound";

const ConversionPage = ({ pair }: { pair: ConversionPair }) => {
  const { t, i18n } = useTranslation(["tools", "common"]);
  const numberLocale = i18n.resolvedLanguage?.startsWith("ne") ? "ne-NP" : "en-US";

  usePageMeta(buildLandConversionMeta(SITE_URL, pair));

  const format = (n: number) => formatConverted(n, numberLocale);
  const unitTitle = (u: AreaUnit) => t(`landConverter.units.${u}.title` as const);
  const unitName = (u: AreaUnit, count: number) => t(`landConverter.units.${u}.name` as const, { count });
  const spelling = (u: AreaUnit) =>
    i18n.exists(`landConverter.units.${u}.spelling`, { ns: "tools" }) ? t(`landConverter.units.${u}.spelling` as const) : null;

  const factor = conversionFactor(pair);
  const example = exampleAmount(pair);
  const titleParams = { from: unitTitle(pair.from), to: unitTitle(pair.to) };
  const nameParams = { from: unitName(pair.from, 2), to: unitName(pair.to, 2) };
  const spellings = [spelling(pair.from), spelling(pair.to)].filter(Boolean);

  const equation = (amount: number, from: AreaUnit, to: AreaUnit, value: number) =>
    t("landConverter.pair.equation", {
      amount: format(amount),
      from: unitName(from, amount),
      value: format(value),
      to: unitName(to, value),
    });

  const formula =
    factor >= 1
      ? t("landConverter.pair.formulaMultiply", {
          ...nameParams,
          factor: format(factor),
          amount: format(example),
          value: format(example * factor),
          resultUnit: unitName(pair.to, example * factor),
        })
      : t("landConverter.pair.formulaDivide", {
          ...nameParams,
          divisor: format(1 / factor),
          amount: format(example),
          value: format(example * factor),
          resultUnit: unitName(pair.to, example * factor),
        });

  return (
    <>
      <Navbar />
      <main className="container page-padding max-w-4xl">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">{t("nav.home", { ns: "common" })}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={LAND_CONVERTER_PATH}>{t("landConverter.breadcrumb")}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{t("landConverter.pair.breadcrumb", titleParams)}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <p className="text-xs font-semibold uppercase tracking-widest text-primary">{t("landConverter.eyebrow")}</p>
        <h1 className="mt-1 font-heading">{t("landConverter.pair.title", titleParams)}</h1>
        <p className="mt-3 font-heading text-xl font-semibold">{equation(1, pair.from, pair.to, factor)}</p>
        <p className="mt-1 text-muted-foreground">{equation(1, pair.to, pair.from, 1 / factor)}</p>
        {spellings.length > 0 && <p className="mt-3 text-sm text-muted-foreground">{spellings.join(" ")}</p>}

        <LandAreaConverter initialUnit={pair.from} target={pair.to} />

        <section className="mt-12">
          <h2 className="font-heading text-xl font-semibold">{t("landConverter.pair.formulaTitle", nameParams)}</h2>
          <p className="mt-2 text-muted-foreground">{formula}</p>
        </section>

        <section className="mt-12">
          <h2 className="font-heading text-xl font-semibold">{t("landConverter.pair.tableTitle", titleParams)}</h2>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{titleParams.from}</TableHead>
                  <TableHead className="text-right">{titleParams.to}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pair.amounts.map((amount) => (
                  <TableRow key={amount}>
                    <TableCell className="font-medium">
                      {format(amount)} {unitName(pair.from, amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {format(amount * factor)} {unitName(pair.to, amount * factor)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <ConversionLinks title={t("landConverter.pair.otherTitle")} current={pair} />
        <p className="mt-6">
          <Link to={LAND_CONVERTER_PATH} className="font-medium underline underline-offset-4 hover:text-primary">
            {t("landConverter.fullConverter")}
          </Link>
        </p>

        <LandConverterCta />
      </main>
      <Footer />
    </>
  );
};

const LandUnitConversion = () => {
  const { pair: slug } = useParams<{ pair: string }>();
  const pair = slug ? findConversionPair(slug) : undefined;
  return pair ? <ConversionPage pair={pair} /> : <NotFound />;
};

export default LandUnitConversion;
