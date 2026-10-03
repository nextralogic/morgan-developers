import { AREA_UNITS } from "./area-utils.ts";
import { buildBreadcrumbJsonLd, LAND_AREA_CALCULATOR_PATH, withBrand, type MetaTags } from "./seo/core.ts";

/**
 * Plot area from its measurements, for /land-area-calculator. Shared by the
 * React app and the Netlify edge functions, so imports keep their .ts extension.
 */

export type LengthUnit = "feet" | "metres";

const SQFT_PER_SQUARE: Record<LengthUnit, number> = {
  feet: 1,
  metres: AREA_UNITS.sq_meter.toSqft,
};

/** Common plot sizes in feet, length by breadth. */
export const COMMON_PLOT_SIZES: [number, number][] = [
  [20, 30],
  [25, 40],
  [30, 40],
  [30, 50],
  [30, 60],
  [40, 50],
  [40, 60],
  [50, 60],
  [50, 80],
  [60, 80],
];

/** The plot used for the worked example. */
export const EXAMPLE_PLOT: [number, number] = [30, 40];

export function rectangleAreaSqft(length: number, breadth: number, unit: LengthUnit): number {
  return length * breadth * SQFT_PER_SQUARE[unit];
}

/**
 * Estimate for a four-sided plot whose opposite sides differ: the averages of
 * the two pairs of opposite sides multiplied together. Exact for rectangles and
 * slightly high when the corners are far from square.
 */
export function unevenAreaSqft(front: number, back: number, left: number, right: number, unit: LengthUnit): number {
  return rectangleAreaSqft((front + back) / 2, (left + right) / 2, unit);
}

export function buildLandAreaCalculatorMeta(siteUrl: string): MetaTags {
  const url = `${siteUrl}${LAND_AREA_CALCULATOR_PATH}`;
  return {
    title: withBrand("Land Area Calculator – Feet to Aana, Ropani & Kattha"),
    description:
      "Work out land area from length and breadth in feet or metres. Get the size in aana, ropani-aana-paisa-daam, " +
      "kattha and square feet, with common plot sizes.",
    canonical: url,
    ogType: "website",
    jsonLd: [
      buildBreadcrumbJsonLd([
        { name: "Home", url: `${siteUrl}/` },
        { name: "Land Area Calculator", url },
      ]),
    ],
  };
}
