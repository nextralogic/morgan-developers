/**
 * Utility for generating and parsing property URLs in the format:
 * /properties/{slug}-{propertyPublicId}
 */

export function generatePropertySlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function buildPropertyUrl(title: string, propertyPublicId: number): string {
  const slug = generatePropertySlug(title);
  return `/properties/${slug}-${propertyPublicId}`;
}

/**
 * Parse property public ID from a slug-id param like "beautiful-land-in-kathmandu-2567"
 * Returns the numeric ID from the end, or null if not found.
 */
export function parsePropertyPublicId(param: string): number | null {
  const match = param.match(/-(\d+)$/);
  if (match) return parseInt(match[1], 10);
  // Fallback: try parsing the whole param as a number (old UUID links won't match)
  return null;
}

/**
 * Check if param looks like a UUID (old format)
 */
export function isUUID(param: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param);
}
