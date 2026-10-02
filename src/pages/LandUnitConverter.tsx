import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AREA_UNITS, sqftToNepali, sqftToTerai, type AreaUnit } from "@/lib/area-utils";
import { usePageMeta } from "@/lib/seo/usePageMeta";
import { SITE_URL } from "@/lib/seo/constants";
import { buildLandConverterMeta } from "@/lib/seo/core";

const RESULT_UNITS: AreaUnit[] = ["ropani", "aana", "paisa", "daam", "bigha", "kattha", "dhur", "sq_feet", "sq_meter", "acres"];
const HILL_UNITS: AreaUnit[] = ["ropani", "aana", "paisa", "daam"];
const TERAI_UNITS: AreaUnit[] = ["bigha", "kattha", "dhur"];
const SQFT_PER_SQM = AREA_UNITS.sq_meter.toSqft;

const LandUnitConverter = () => {
  const { t, i18n } = useTranslation(["tools", "common"]);
  const numberLocale = i18n.resolvedLanguage?.startsWith("ne") ? "ne-NP" : "en-US";
  const [value, setValue] = useState("1");
  const [unit, setUnit] = useState<AreaUnit>("ropani");

  usePageMeta(buildLandConverterMeta(SITE_URL));

  const format = (n: number, maxDigits = 2) => n.toLocaleString(numberLocale, { maximumFractionDigits: maxDigits });
  const unitLabel = (u: AreaUnit) => t(`areaUnits.${u}` as const, { ns: "common" });

  const amount = Number(value);
  const sqft = value.trim() !== "" && Number.isFinite(amount) && amount > 0 ? amount * AREA_UNITS[unit].toSqft : null;

  const hill = useMemo(() => (sqft ? sqftToNepali(sqft) : null), [sqft]);
  const terai = useMemo(() => (sqft ? sqftToTerai(sqft) : null), [sqft]);

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

        <Card className="mt-8 rounded-xl">
          <CardContent className="p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="converter-value">{t("landConverter.valueLabel")}</Label>
                <Input
                  id="converter-value"
                  className="mt-1.5"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="converter-unit">{t("landConverter.unitLabel")}</Label>
                <Select value={unit} onValueChange={(v) => setUnit(v as AreaUnit)}>
                  <SelectTrigger id="converter-unit" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESULT_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{unitLabel(u)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <h2 className="mt-8 font-heading text-lg font-semibold">{t("landConverter.resultsTitle")}</h2>
            {sqft === null ? (
              <p className="mt-3 text-sm text-destructive" role="status">{t("landConverter.invalid")}</p>
            ) : (
              <div aria-live="polite">
                <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {RESULT_UNITS.map((u) => (
                    <div key={u} className="rounded-lg border bg-muted/30 p-3">
                      <dt className="text-xs text-muted-foreground">{unitLabel(u)}</dt>
                      <dd className="mt-1 font-heading text-base font-semibold">{format(sqft / AREA_UNITS[u].toSqft, 4)}</dd>
                    </div>
                  ))}
                </dl>
                {hill && terai && (
                  <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <dt className="text-xs text-muted-foreground">{t("landConverter.hillBreakdown")}</dt>
                      <dd className="mt-1 font-heading font-semibold">
                        {[hill.ropani, hill.anna, hill.paisa, hill.dam].map((n) => format(n, 0)).join("-")}
                      </dd>
                    </div>
                    <div className="rounded-lg border p-3">
                      <dt className="text-xs text-muted-foreground">{t("landConverter.teraiBreakdown")}</dt>
                      <dd className="mt-1 font-heading font-semibold">
                        {[format(terai.bigha, 0), format(terai.kattha, 0), format(terai.dhur)].join("-")}
                      </dd>
                    </div>
                  </dl>
                )}
              </div>
            )}
          </CardContent>
        </Card>

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

        <Card className="mt-12 rounded-xl bg-muted/30">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold">{t("landConverter.cta.title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("landConverter.cta.text")}</p>
            </div>
            <Button asChild className="shrink-0 gap-2">
              <Link to="/properties">
                {t("landConverter.cta.button")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
};

export default LandUnitConverter;
