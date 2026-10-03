import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ConversionLinks from "@/components/ConversionLinks";
import LandConverterCta from "@/components/LandConverterCta";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AREA_UNITS, sqftToNepali, sqftToTerai } from "@/lib/area-utils";
import {
  buildLandAreaCalculatorMeta,
  COMMON_PLOT_SIZES,
  EXAMPLE_PLOT,
  rectangleAreaSqft,
  unevenAreaSqft,
  type LengthUnit,
} from "@/lib/land-area";
import { usePageMeta } from "@/lib/seo/usePageMeta";
import { SITE_URL } from "@/lib/seo/constants";
import { LAND_CONVERTER_PATH } from "@/lib/seo/core";

type Shape = "rectangle" | "uneven";
type Side = "length" | "breadth" | "front" | "back" | "left" | "right";

const SIDES: Record<Shape, Side[]> = {
  rectangle: ["length", "breadth"],
  uneven: ["front", "back", "left", "right"],
};

const RESULT_KEYS = ["sqft", "sqm", "aana", "hill", "kattha", "terai"] as const;

const LandAreaCalculator = () => {
  const { t, i18n } = useTranslation(["tools", "common"]);
  const numberLocale = i18n.resolvedLanguage?.startsWith("ne") ? "ne-NP" : "en-US";

  usePageMeta(buildLandAreaCalculatorMeta(SITE_URL));

  const [shape, setShape] = useState<Shape>("rectangle");
  const [unit, setUnit] = useState<LengthUnit>("feet");
  const [sides, setSides] = useState<Record<Side, string>>({
    length: "30",
    breadth: "40",
    front: "30",
    back: "32",
    left: "40",
    right: "38",
  });

  const format = (n: number, maxDigits = 2) => n.toLocaleString(numberLocale, { maximumFractionDigits: maxDigits });
  const hillNotation = (sqft: number) => {
    const { ropani, anna, paisa, dam } = sqftToNepali(sqft);
    return [ropani, anna, paisa, dam].map((n) => format(n, 0)).join("-");
  };
  const teraiNotation = (sqft: number) => {
    const { bigha, kattha, dhur } = sqftToTerai(sqft);
    return [format(bigha, 0), format(kattha, 0), format(dhur)].join("-");
  };

  const activeSides = SIDES[shape];
  const values = activeSides.map((side) => Number(sides[side]));
  const valid =
    activeSides.every((side) => sides[side].trim() !== "") && values.every((v) => Number.isFinite(v) && v > 0);
  const sqft = !valid
    ? null
    : shape === "rectangle"
      ? rectangleAreaSqft(values[0], values[1], unit)
      : unevenAreaSqft(values[0], values[1], values[2], values[3], unit);

  const resultValues: Record<(typeof RESULT_KEYS)[number], (sqft: number) => string> = {
    sqft: (n) => format(n),
    sqm: (n) => format(n / AREA_UNITS.sq_meter.toSqft),
    aana: (n) => format(n / AREA_UNITS.aana.toSqft),
    hill: hillNotation,
    kattha: (n) => format(n / AREA_UNITS.kattha.toSqft),
    terai: teraiNotation,
  };

  const [exampleLength, exampleBreadth] = EXAMPLE_PLOT;
  const exampleSqft = rectangleAreaSqft(exampleLength, exampleBreadth, "feet");

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
              <BreadcrumbPage>{t("areaCalculator.breadcrumb")}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <p className="text-xs font-semibold uppercase tracking-widest text-primary">{t("areaCalculator.eyebrow")}</p>
        <h1 className="mt-1 font-heading">{t("areaCalculator.title")}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{t("areaCalculator.intro")}</p>

        <Card className="mt-8 rounded-xl">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium" id="plot-shape-label">{t("areaCalculator.modes.label")}</p>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={shape}
                  onValueChange={(v) => v && setShape(v as Shape)}
                  aria-labelledby="plot-shape-label"
                  className="mt-1.5 justify-start"
                >
                  <ToggleGroupItem value="rectangle">{t("areaCalculator.modes.rectangle")}</ToggleGroupItem>
                  <ToggleGroupItem value="uneven">{t("areaCalculator.modes.uneven")}</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="sm:w-40">
                <Label htmlFor="calculator-unit">{t("areaCalculator.unitLabel")}</Label>
                <Select value={unit} onValueChange={(v) => setUnit(v as LengthUnit)}>
                  <SelectTrigger id="calculator-unit" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feet">{t("areaCalculator.units.feet")}</SelectItem>
                    <SelectItem value="metres">{t("areaCalculator.units.metres")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {activeSides.map((side) => (
                <div key={side}>
                  <Label htmlFor={`side-${side}`}>{t(`areaCalculator.fields.${side}` as const)}</Label>
                  <Input
                    id={`side-${side}`}
                    className="mt-1.5"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={sides[side]}
                    onChange={(e) => setSides((prev) => ({ ...prev, [side]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            {shape === "uneven" && <p className="mt-3 text-sm text-muted-foreground">{t("areaCalculator.unevenNote")}</p>}

            <h2 className="mt-8 font-heading text-lg font-semibold">{t("areaCalculator.resultsTitle")}</h2>
            {sqft === null ? (
              <p className="mt-3 text-sm text-destructive" role="status">{t("areaCalculator.invalid")}</p>
            ) : (
              <div aria-live="polite">
                <p className="mt-4 rounded-lg bg-primary/10 p-4 font-heading text-lg font-semibold">
                  {t("areaCalculator.result", { sqft: format(sqft), aana: format(sqft / AREA_UNITS.aana.toSqft) })}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {RESULT_KEYS.map((key) => (
                    <div key={key} className="rounded-lg border bg-muted/30 p-3">
                      <dt className="text-xs text-muted-foreground">{t(`areaCalculator.results.${key}` as const)}</dt>
                      <dd className="mt-1 font-heading text-base font-semibold">{resultValues[key](sqft)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </CardContent>
        </Card>

        <section className="mt-12">
          <h2 className="font-heading text-xl font-semibold">{t("areaCalculator.commonTitle")}</h2>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("areaCalculator.table.size")}</TableHead>
                  <TableHead className="text-right">{t("areaCalculator.table.sqft")}</TableHead>
                  <TableHead className="text-right">{t("areaCalculator.table.aana")}</TableHead>
                  <TableHead className="text-right">{t("areaCalculator.table.hill")}</TableHead>
                  <TableHead className="text-right">{t("areaCalculator.table.dhur")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {COMMON_PLOT_SIZES.map(([length, breadth]) => {
                  const area = rectangleAreaSqft(length, breadth, "feet");
                  return (
                    <TableRow key={`${length}x${breadth}`}>
                      <TableCell className="font-medium">
                        {t("areaCalculator.sizeValue", { length: format(length), breadth: format(breadth) })}
                      </TableCell>
                      <TableCell className="text-right">{format(area)}</TableCell>
                      <TableCell className="text-right">{format(area / AREA_UNITS.aana.toSqft)}</TableCell>
                      <TableCell className="text-right">{hillNotation(area)}</TableCell>
                      <TableCell className="text-right">{format(area / AREA_UNITS.dhur.toSqft)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-heading text-xl font-semibold">{t("areaCalculator.howTitle")}</h2>
          <p className="mt-2 text-muted-foreground">
            {t("areaCalculator.howRectangle", {
              length: format(exampleLength),
              breadth: format(exampleBreadth),
              sqft: format(exampleSqft),
              aanaSqft: format(AREA_UNITS.aana.toSqft),
              aana: format(exampleSqft / AREA_UNITS.aana.toSqft),
              hill: hillNotation(exampleSqft),
            })}
          </p>
          <p className="mt-2 text-muted-foreground">
            {t("areaCalculator.howMetres", { factor: format(AREA_UNITS.sq_meter.toSqft, 4) })}
          </p>
          <p className="mt-2 text-muted-foreground">{t("areaCalculator.howUneven")}</p>
        </section>

        <ConversionLinks title={t("areaCalculator.convertTitle")} />
        <p className="mt-6">
          <Link to={LAND_CONVERTER_PATH} className="font-medium underline underline-offset-4 hover:text-primary">
            {t("areaCalculator.converterLink")}
          </Link>
        </p>

        <LandConverterCta />
      </main>
      <Footer />
    </>
  );
};

export default LandAreaCalculator;
