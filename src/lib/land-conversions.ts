import { AREA_UNITS, type AreaUnit } from "./area-utils.ts";
import { buildBreadcrumbJsonLd, LAND_CONVERTER_PATH, withBrand, type MetaTags } from "./seo/core.ts";

/**
 * Single-pair converter pages such as /land-unit-converter/ropani-to-square-feet.
 * Shared by the React app and the Netlify edge functions, so imports keep their
 * .ts extension for Deno.
 */

export interface ConversionPair {
  from: AreaUnit;
  to: AreaUnit;
  /** Amounts listed in the conversion table. */
  amounts: number[];
}

export const CONVERSION_PAIRS: ConversionPair[] = [
  { from: "ropani", to: "sq_feet", amounts: [0.5, 1, 2, 3, 4, 5, 6, 8, 10, 20] },
  { from: "aana", to: "sq_feet", amounts: [1, 2, 3, 4, 5, 6, 8, 10, 12, 16] },
  { from: "paisa", to: "sq_feet", amounts: [1, 2, 3, 4, 5, 6, 8, 10, 12, 16] },
  { from: "bigha", to: "sq_feet", amounts: [0.25, 0.5, 1, 2, 3, 4, 5, 10, 15, 20] },
  { from: "kattha", to: "sq_feet", amounts: [1, 2, 3, 4, 5, 6, 8, 10, 15, 20] },
  { from: "dhur", to: "sq_feet", amounts: [1, 2, 3, 4, 5, 8, 10, 12, 15, 20] },
  { from: "ropani", to: "sq_meter", amounts: [0.5, 1, 2, 3, 4, 5, 6, 8, 10, 20] },
  { from: "aana", to: "sq_meter", amounts: [1, 2, 3, 4, 5, 6, 8, 10, 12, 16] },
  { from: "ropani", to: "aana", amounts: [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 10] },
  { from: "bigha", to: "kattha", amounts: [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 10] },
  { from: "bigha", to: "ropani", amounts: [0.25, 0.5, 1, 1.5, 2, 3, 4, 5, 10, 20] },
  { from: "sq_feet", to: "aana", amounts: [100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 5000] },
];

interface UnitName {
  title: string;
  short: string;
  one: string;
  other: string;
  /** Another common English spelling. */
  alias?: string;
}

/** English unit names. The app shows the same names from the tools locale. */
export const UNIT_NAMES: Record<AreaUnit, UnitName> = {
  sq_feet: { title: "Square Feet", short: "Sq Ft", one: "square foot", other: "square feet" },
  sq_meter: { title: "Square Metres", short: "Sq M", one: "square metre", other: "square metres" },
  ropani: { title: "Ropani", short: "Ropani", one: "ropani", other: "ropani" },
  aana: { title: "Aana", short: "Aana", one: "aana", other: "aana", alias: "anna" },
  paisa: { title: "Paisa", short: "Paisa", one: "paisa", other: "paisa" },
  daam: { title: "Daam", short: "Daam", one: "daam", other: "daam", alias: "dam" },
  bigha: { title: "Bigha", short: "Bigha", one: "bigha", other: "bigha" },
  kattha: { title: "Kattha", short: "Kattha", one: "kattha", other: "kattha", alias: "katha" },
  dhur: { title: "Dhur", short: "Dhur", one: "dhur", other: "dhur" },
  haat: { title: "Haat", short: "Haat", one: "haat", other: "haat" },
  acres: { title: "Acres", short: "Acres", one: "acre", other: "acres" },
};

const UNIT_SLUGS: Partial<Record<AreaUnit, string>> = {
  sq_feet: "square-feet",
  sq_meter: "square-metres",
};

function unitSlug(unit: AreaUnit): string {
  return UNIT_SLUGS[unit] ?? unit;
}

export function conversionSlug(pair: ConversionPair): string {
  return `${unitSlug(pair.from)}-to-${unitSlug(pair.to)}`;
}

export function conversionPath(pair: ConversionPair): string {
  return `${LAND_CONVERTER_PATH}/${conversionSlug(pair)}`;
}

export function findConversionPair(slug: string): ConversionPair | undefined {
  return CONVERSION_PAIRS.find((pair) => conversionSlug(pair) === slug);
}

/** The converter page for a unit, preferring conversion to square feet. */
export function converterPairForUnit(unit: string | null | undefined): ConversionPair | undefined {
  if (!unit) return undefined;
  return (
    CONVERSION_PAIRS.find((pair) => pair.from === unit && pair.to === "sq_feet") ??
    CONVERSION_PAIRS.find((pair) => pair.from === unit)
  );
}

/** How many `to` units make up one `from` unit. */
export function conversionFactor(pair: ConversionPair): number {
  return AREA_UNITS[pair.from].toSqft / AREA_UNITS[pair.to].toSqft;
}

/** Two decimals for normal values, four significant digits below one so small factors stay readable. */
export function formatConverted(value: number, locale = "en-US"): string {
  const options: Intl.NumberFormatOptions =
    value !== 0 && Math.abs(value) < 1 ? { maximumSignificantDigits: 4 } : { maximumFractionDigits: 2 };
  return value.toLocaleString(locale, options);
}

export function unitName(unit: AreaUnit, amount: number): string {
  return amount === 1 ? UNIT_NAMES[unit].one : UNIT_NAMES[unit].other;
}

function titleWithAlias(unit: AreaUnit): string {
  const { short, alias } = UNIT_NAMES[unit];
  return alias ? `${short} (${alias.charAt(0).toUpperCase()}${alias.slice(1)})` : short;
}

function nameWithAlias(unit: AreaUnit): string {
  const { other, alias } = UNIT_NAMES[unit];
  return alias ? `${other} (${alias})` : other;
}

/** Middle row of the table, used for the worked example. */
export function exampleAmount(pair: ConversionPair): number {
  return pair.amounts[Math.floor(pair.amounts.length / 2)];
}

export function buildLandConversionMeta(siteUrl: string, pair: ConversionPair): MetaTags {
  const from = UNIT_NAMES[pair.from];
  const to = UNIT_NAMES[pair.to];
  const factor = conversionFactor(pair);
  const url = `${siteUrl}${conversionPath(pair)}`;
  return {
    title: withBrand(
      `${titleWithAlias(pair.from)} to ${titleWithAlias(pair.to)} Converter – 1 ${from.short} = ${formatConverted(factor)} ${to.short}`
    ),
    description:
      `Convert ${nameWithAlias(pair.from)} to ${nameWithAlias(pair.to)}: 1 ${from.one} = ${formatConverted(factor)} ${unitName(pair.to, factor)}. ` +
      `Free ${from.other} to ${to.other} calculator with a conversion table and the formula.`,
    canonical: url,
    ogType: "website",
    jsonLd: [
      buildBreadcrumbJsonLd([
        { name: "Home", url: `${siteUrl}/` },
        { name: "Land Unit Converter", url: `${siteUrl}${LAND_CONVERTER_PATH}` },
        { name: `${from.title} to ${to.title}`, url },
      ]),
    ],
  };
}
