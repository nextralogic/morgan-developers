/**
 * Supported area units and their conversion factors to sq.ft.
 */
export const AREA_UNITS = {
  sq_feet: { toSqft: 1 },
  sq_meter: { toSqft: 10.7639 },
  ropani: { toSqft: 5476 },
  aana: { toSqft: 342.25 },
  paisa: { toSqft: 85.5625 },
  daam: { toSqft: 21.390625 },
  bigha: { toSqft: 72900 },
  kattha: { toSqft: 3645 },
  dhur: { toSqft: 182.25 },
  haat: { toSqft: 2.25 },
  acres: { toSqft: 43560 },
} as const;

export type AreaUnit = keyof typeof AREA_UNITS;

// Any i18next `t`, whatever namespaces it was created with. This file also runs in the
// edge functions, so it does not import i18next types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TranslateFn = (...args: any[]) => string;

const UNIT_FALLBACK_LABELS: Record<AreaUnit, string> = {
  sq_feet: "Sq. Feet",
  sq_meter: "Sq. Meter",
  ropani: "Ropani",
  aana: "Aana",
  paisa: "Paisa",
  daam: "Daam",
  bigha: "Bigha",
  kattha: "Kattha",
  dhur: "Dhur",
  haat: "Haat",
  acres: "Acres",
};

/**
 * Convert a value in the given unit to sq.ft.
 * Returns null for invalid inputs.
 */
export function convertToSqft(value: number, unit: AreaUnit): number | null {
  if (!isFinite(value) || value < 0) return null;
  const factor = AREA_UNITS[unit]?.toSqft;
  if (!factor) return null;
  return Math.round(value * factor * 100) / 100;
}

/**
 * Convert sq.ft to Nepali land units (ropani-anna-paisa-dam). Rounds to whole
 * dam first, so a dam that rounds up carries into the paisa, anna or ropani.
 * 1 ropani = 16 anna = 64 paisa = 256 dam.
 */
export function sqftToNepali(sqft: number) {
  const dams = Math.round(sqft / AREA_UNITS.daam.toSqft);
  return {
    ropani: Math.floor(dams / 256),
    anna: Math.floor(dams / 16) % 16,
    paisa: Math.floor(dams / 4) % 4,
    dam: dams % 4,
  };
}

/**
 * Convert sq.ft to Terai land units (bigha-kattha-dhur), with dhur to two
 * decimals. 1 bigha = 20 kattha = 400 dhur.
 */
export function sqftToTerai(sqft: number) {
  const hundredthsOfDhur = Math.round((sqft / AREA_UNITS.dhur.toSqft) * 100);
  return {
    bigha: Math.floor(hundredthsOfDhur / 40_000),
    kattha: Math.floor(hundredthsOfDhur / 2_000) % 20,
    dhur: (hundredthsOfDhur % 2_000) / 100,
  };
}

const HILL_UNITS: readonly string[] = ["ropani", "aana", "paisa", "daam"];
const TERAI_UNITS: readonly string[] = ["bigha", "kattha", "dhur"];

/**
 * The unit land prices are usually quoted in: per aana where land is measured
 * in ropani, per kattha in the Terai, and per sq.ft otherwise.
 */
export function priceQuoteUnit(unit: string | null | undefined): AreaUnit {
  if (unit && HILL_UNITS.includes(unit)) return "aana";
  if (unit && TERAI_UNITS.includes(unit)) return "kattha";
  return "sq_feet";
}

/** Total area in sq.ft, from the stored sq.ft value or from the entered value and unit. */
export function listingAreaSqft(
  sqft: number | null | undefined,
  value: number | null | undefined,
  unit: string | null | undefined
): number | null {
  if (sqft && sqft > 0) return sqft;
  if (value && value > 0 && unit && unit in AREA_UNITS) return convertToSqft(value, unit as AreaUnit);
  return null;
}

/** Price of one `unit` of land, e.g. NPR per aana. */
export function pricePerUnit(price: number, sqft: number, unit: AreaUnit): number {
  return (price / sqft) * AREA_UNITS[unit].toSqft;
}

/**
 * Format area for display using user's chosen unit with sq.ft as secondary.
 * e.g. "3 Kattha (approx 10,935 sq.ft)"
 */
export function formatAreaWithUnit(
  value: number | null,
  unit: string | null,
  sqft: number | null,
  options?: {
    t?: TranslateFn;
    locale?: string;
  }
): string {
  const t = options?.t;
  const locale = options?.locale ?? "en-US";
  const unitKey = (unit || "sq_feet") as AreaUnit;
  const unitInfo = AREA_UNITS[unitKey];
  const unitLabel = t ? t(`areaUnits.${unitKey}`, { ns: "common" }) : UNIT_FALLBACK_LABELS[unitKey];

  if (value != null && unitInfo && unitKey !== "sq_feet") {
    const approxSqft = sqft ?? convertToSqft(value, unitKey);
    const valueText = value.toLocaleString(locale);
    const sqftStr = approxSqft != null
      ? (t
        ? t("area.approxSqft", {
            ns: "common",
            value: Math.round(approxSqft).toLocaleString(locale),
          })
        : ` (approx ${Math.round(approxSqft).toLocaleString(locale)} sq.ft)`)
      : "";
    return `${valueText} ${unitLabel}${sqftStr}`;
  }

  // Fallback: sq_feet or missing unit
  const displaySqft = sqft ?? value ?? 0;
  if (t) {
    return t("area.sqftValue", {
      ns: "common",
      value: Math.round(displaySqft).toLocaleString(locale),
    });
  }
  return `${Math.round(displaySqft).toLocaleString(locale)} sq.ft`;
}
