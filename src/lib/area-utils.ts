/**
 * Supported area units and their conversion factors to sq.ft.
 */
export const AREA_UNITS = {
  sq_feet: { label: "Sq. Feet", toSqft: 1 },
  sq_meter: { label: "Sq. Meter", toSqft: 10.7639 },
  ropani: { label: "Ropani", toSqft: 5476 },
  aana: { label: "Aana", toSqft: 342.25 },
  paisa: { label: "Paisa", toSqft: 85.5625 },
  daam: { label: "Daam", toSqft: 21.390625 },
  bigha: { label: "Bigha", toSqft: 72900 },
  kattha: { label: "Kattha", toSqft: 3645 },
  dhur: { label: "Dhur", toSqft: 182.25 },
  haat: { label: "Haat", toSqft: 2.25 },
  acres: { label: "Acres", toSqft: 43560 },
} as const;

export type AreaUnit = keyof typeof AREA_UNITS;

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
 * Convert sq.ft to Nepali land units (ropani-anna-paisa-dam).
 */
export function sqftToNepali(sqft: number) {
  const ropani = Math.floor(sqft / 5476);
  let remainder = sqft % 5476;
  const anna = Math.floor(remainder / 342.25);
  remainder = remainder % 342.25;
  const paisa = Math.floor(remainder / 85.5625);
  remainder = remainder % 85.5625;
  const dam = Math.round(remainder / 21.390625);
  return { ropani, anna, paisa, dam };
}

export function formatNepaliArea(sqft: number): string {
  const { ropani, anna, paisa, dam } = sqftToNepali(sqft);
  const parts: string[] = [];
  if (ropani > 0) parts.push(`${ropani} Ropani`);
  if (anna > 0) parts.push(`${anna} Anna`);
  if (paisa > 0) parts.push(`${paisa} Paisa`);
  if (dam > 0) parts.push(`${dam} Dam`);
  return parts.length > 0 ? parts.join(" ") : "0 Dam";
}

/**
 * Format area for display using user's chosen unit with sq.ft as secondary.
 * e.g. "3 Kattha (approx 10,935 sq.ft)"
 */
export function formatAreaWithUnit(value: number | null, unit: string | null, sqft: number | null): string {
  const unitKey = (unit || "sq_feet") as AreaUnit;
  const unitInfo = AREA_UNITS[unitKey];

  if (value != null && unitInfo && unitKey !== "sq_feet") {
    const approxSqft = sqft ?? convertToSqft(value, unitKey);
    const sqftStr = approxSqft != null ? ` (approx ${Math.round(approxSqft).toLocaleString()} sq.ft)` : "";
    return `${value} ${unitInfo.label}${sqftStr}`;
  }

  // Fallback: sq_feet or missing unit
  const displaySqft = sqft ?? value ?? 0;
  return `${Math.round(displaySqft).toLocaleString()} sq.ft`;
}

/** Legacy helper – still used for filters/sorting display */
export function formatArea(sqft: number): string {
  const nepali = formatNepaliArea(sqft);
  return `${nepali} (${sqft.toLocaleString()} sq.ft)`;
}
