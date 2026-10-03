import { Link } from "react-router-dom";
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
import { AREA_UNITS, type AreaUnit } from "@/lib/area-utils";
import { usePageMeta } from "@/lib/seo/usePageMeta";
import { SITE_URL } from "@/lib/seo/constants";
import { buildLandConverterMeta, LAND_AREA_CALCULATOR_PATH } from "@/lib/seo/core";

const HILL_UNITS: AreaUnit[] = ["ropani", "aana", "paisa", "daam"];
const TERAI_UNITS: AreaUnit[] = ["bigha", "kattha", "dhur"];
const SQFT_PER_SQM = AREA_UNITS.sq_meter.toSqft;

const LandUnitConverter = () => {
  const { t, i18n } = useTranslation(["tools", "common"]);
  const numberLocale = i18n.resolvedLanguage?.startsWith("ne") ? "ne-NP" : "en-US";

  usePageMeta(buildLandConverterMeta(SITE_URL));

  const format = (n: number, maxDigits = 2) => n.toLocaleString(numberLocale, { maximumFractionDigits: maxDigits });
  const unitLabel = (u: AreaUnit) => t(`areaUnits.${u}` as const, { ns: "common" });

  const renderTable = (units: AreaUnit[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("landConverter.table.unit")}</TableHead>
          <TableHead className="text-right">{t("landConverter.table.sqft")}</TableHead>
          <TableHead className="text-right">{t("landConverter.table.sqm")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {units.map((u) => (
          <TableRow key={u}>
            <TableCell className="font-medium">1 {unitLabel(u)}</TableCell>
            <TableCell className="text-right">{format(AREA_UNITS[u].toSqft)}</TableCell>
            <TableCell className="text-right">{format(AREA_UNITS[u].toSqft / SQFT_PER_SQM)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

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
              <BreadcrumbPage>{t("landConverter.breadcrumb")}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <p className="text-xs font-semibold uppercase tracking-widest text-primary">{t("landConverter.eyebrow")}</p>
        <h1 className="mt-1 font-heading">{t("landConverter.title")}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{t("landConverter.intro")}</p>

        <LandAreaConverter />

        <section className="mt-12">
          <h2 className="font-heading text-xl font-semibold">{t("landConverter.hillTableTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("landConverter.hillTableIntro")}</p>
          <div className="mt-4">{renderTable(HILL_UNITS)}</div>
        </section>

        <section className="mt-12">
          <h2 className="font-heading text-xl font-semibold">{t("landConverter.teraiTableTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("landConverter.teraiTableIntro")}</p>
          <div className="mt-4">{renderTable(TERAI_UNITS)}</div>
        </section>

        <section className="mt-12">
          <h2 className="font-heading text-xl font-semibold">{t("landConverter.compareTitle")}</h2>
          <p className="mt-2 text-muted-foreground">
            {t("landConverter.compareText", {
              ropaniPerBigha: format(AREA_UNITS.bigha.toSqft / AREA_UNITS.ropani.toSqft),
              katthaPerRopani: format(AREA_UNITS.ropani.toSqft / AREA_UNITS.kattha.toSqft),
              acrePerRopani: format(AREA_UNITS.ropani.toSqft / AREA_UNITS.acres.toSqft, 3),
            })}
          </p>
        </section>

        <ConversionLinks title={t("landConverter.popularTitle")} />
        <p className="mt-6">
          <Link to={LAND_AREA_CALCULATOR_PATH} className="font-medium underline underline-offset-4 hover:text-primary">
            {t("landConverter.calculatorLink")}
          </Link>
        </p>

        <LandConverterCta />
      </main>
      <Footer />
    </>
  );
};

export default LandUnitConverter;
