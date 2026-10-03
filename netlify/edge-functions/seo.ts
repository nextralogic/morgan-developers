import type { Config, Context } from "@netlify/edge-functions";
import {
  buildHomeMeta,
  buildLandConverterMeta,
  buildListingIndexMeta,
  buildNoIndexMeta,
  buildPropertyMeta,
  buildPropertyPath,
  injectHeadTags,
  LAND_AREA_CALCULATOR_PATH,
  LAND_CONVERTER_PATH,
  PRIVACY_POLICY_PATH,
  isUUID,
  parsePropertyPublicId,
  type MetaTags,
  type SeoLocation,
  type SeoProperty,
} from "../../src/lib/seo/core.ts";
import { getThumbnailUrl } from "../../src/lib/image-url.ts";
import { buildLandConversionMeta, findConversionPair } from "../../src/lib/land-conversions.ts";
import { propertyDataKey } from "../../src/lib/initial-data.ts";
import { buildLandAreaCalculatorMeta } from "../../src/lib/land-area.ts";
import { buildPrivacyPolicyMeta } from "../../src/lib/privacy-policy.ts";
import {
  injectInitialData,
  injectPageContent,
  LISTING_PAGE_SIZE,
  LISTING_SUMMARY_SELECT,
  listingCardImage,
  renderHomeContent,
  renderLandAreaCalculatorContent,
  renderLandConversionContent,
  renderLandConverterContent,
  renderListingIndexContent,
  renderNotFoundContent,
  renderPrivacyPolicyContent,
  renderPropertyContent,
  type ListingSummary,
} from "../lib/page-content.ts";
import { injectModulePreloads } from "../lib/page-chunks.ts";
import { getSiteUrl, supabaseRest } from "../lib/supabase-rest.ts";

/**
 * Renders page-specific <head> tags (title, description, canonical, robots,
 * Open Graph, JSON-LD) into the SPA shell so crawlers and link previews see
 * them without running JavaScript, along with a plain HTML copy of the main
 * content. Also returns real 404/410 status codes and 301s non-canonical
 * listing URLs. Any upstream failure falls back to the untouched page.
 */

const PRIVATE_PATHS = [
  /^\/(login|signup|forgot-password|reset-password|my-properties)\/?$/,
  /^\/admin(\/.*)?$/,
  /^\/properties\/new\/?$/,
  /^\/properties\/[^/]+\/edit\/?$/,
];

/** The lazy page App.tsx renders for each public route, so its code can be preloaded. */
const PAGE_ROUTES: [RegExp, string][] = [
  [/^\/(index\.html)?$/, "Index"],
  [/^\/properties\/?$/, "Properties"],
  [/^\/properties\/[^/]+\/?$/, "PropertyDetail"],
  [/^\/land-unit-converter\/?$/, "LandUnitConverter"],
  [/^\/land-unit-converter\/[^/]+\/?$/, "LandUnitConversion"],
  [/^\/land-area-calculator\/?$/, "LandAreaCalculator"],
  [/^\/privacy-policy\/?$/, "PrivacyPolicy"],
];

function pageForPath(path: string): string | null {
  if (PRIVATE_PATHS.some((pattern) => pattern.test(path))) return null;
  return PAGE_ROUTES.find(([pattern]) => pattern.test(path))?.[1] ?? "NotFound";
}

/**
 * The columns the listing page reads. The row is also embedded in the HTML so
 * the page can render without fetching it again; created_by and view_count are
 * left out on purpose.
 */
const PROPERTY_SELECT = [
  "id",
  "title",
  "description",
  "price",
  "type",
  "status",
  "is_deleted",
  "area_sqft",
  "area_value",
  "area_unit",
  "property_public_id",
  "location_id",
  "created_at",
  "updated_at",
  "locations(id,display_name,province,district,municipality_or_city,ward,area_name)",
  "property_images(*)",
].join(",");

const CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "public, max-age=0, must-revalidate",
  "Netlify-CDN-Cache-Control": "public, durable, s-maxage=600, stale-while-revalidate=86400",
  "Netlify-Vary": "query",
};

interface PropertyRow {
  id: string;
  title: string;
  description: string | null;
  price: number;
  type: string;
  status: string;
  is_deleted: boolean;
  area_sqft: number | null;
  area_value: number | null;
  area_unit: string | null;
  property_public_id: number;
  created_at: string;
  updated_at: string;
  locations: SeoLocation | null;
  property_images: { image_url: string; is_primary: boolean; display_order: number }[] | null;
}

type RouteResult =
  | { meta: MetaTags; status?: number; content?: string; initialData?: Record<string, unknown> }
  | { redirect: string };

function notFound(gone = false): RouteResult {
  return {
    meta: buildNoIndexMeta(gone ? "Property No Longer Available" : "Page Not Found"),
    status: gone ? 410 : 404,
    content: renderNotFoundContent(gone),
  };
}

async function fetchListings(offset: number, limit: number): Promise<ListingSummary[] | null> {
  const result = await supabaseRest<ListingSummary[]>(
    `properties?select=${LISTING_SUMMARY_SELECT}&status=eq.published&is_deleted=eq.false` +
      `&order=created_at.desc&offset=${offset}&limit=${limit}`
  );
  return result?.data ?? null;
}

async function resolveListingIndex(url: URL, siteUrl: string): Promise<RouteResult> {
  const meta = buildListingIndexMeta(siteUrl, url.searchParams);
  // Filtered views are noindex, so they are served without the extra lookup.
  if (meta.robots) return { meta };

  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const listings = await fetchListings((page - 1) * LISTING_PAGE_SIZE, LISTING_PAGE_SIZE);
  if (!listings) return { meta };
  if (listings.length === 0 && page > 1) return notFound();

  const firstImage = listings[0] ? listingCardImage(listings[0]) : null;
  return {
    meta: firstImage ? { ...meta, preloadImage: { href: getThumbnailUrl(firstImage) } } : meta,
    content: renderListingIndexContent(listings, page),
  };
}

async function resolveProperty(url: URL, slug: string, siteUrl: string): Promise<RouteResult | null> {
  const publicId = parsePropertyPublicId(slug);
  // Old links use the UUID, whose last group can be all digits, so it is checked first.
  const filter = isUUID(slug) ? `id=eq.${slug}` : publicId ? `property_public_id=eq.${publicId}` : null;
  if (!filter) return notFound();

  const result = await supabaseRest<PropertyRow[]>(`properties?select=${PROPERTY_SELECT}&${filter}&limit=1`);
  if (!result) return null;

  const row = result.data[0];
  // Row level security hides drafts and removed listings, so a miss means the listing is gone.
  if (!row) return notFound(true);

  const canonicalPath = buildPropertyPath(row.title, row.property_public_id);
  if (url.pathname !== canonicalPath) return { redirect: canonicalPath };

  const images = [...(row.property_images ?? [])].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.display_order - b.display_order
  );

  const property: SeoProperty = {
    title: row.title,
    description: row.description,
    price: Number(row.price),
    type: row.type,
    status: row.status,
    areaSqft: row.area_sqft ? Number(row.area_sqft) : null,
    areaValue: row.area_value ? Number(row.area_value) : null,
    areaUnit: row.area_unit,
    propertyPublicId: row.property_public_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    imageUrls: images.map((img) => img.image_url),
    location: row.locations,
  };
  const initialData =
    row.status === "published" && !row.is_deleted
      ? { [propertyDataKey(canonicalPath.replace("/properties/", ""))]: row }
      : undefined;
  return { meta: buildPropertyMeta(siteUrl, property), content: renderPropertyContent(property), initialData };
}

async function resolveRoute(url: URL, siteUrl: string): Promise<RouteResult | null> {
  const path = url.pathname;

  if (path === "/" || path === "/index.html") {
    const latest = await fetchListings(0, 6);
    return { meta: buildHomeMeta(siteUrl), content: renderHomeContent(latest ?? []) };
  }
  if (path === "/properties" || path === "/properties/") return resolveListingIndex(url, siteUrl);
  if (path === LAND_CONVERTER_PATH || path === `${LAND_CONVERTER_PATH}/`) {
    return { meta: buildLandConverterMeta(siteUrl), content: renderLandConverterContent() };
  }
  if (path === LAND_AREA_CALCULATOR_PATH || path === `${LAND_AREA_CALCULATOR_PATH}/`) {
    return { meta: buildLandAreaCalculatorMeta(siteUrl), content: renderLandAreaCalculatorContent() };
  }
  if (path === PRIVACY_POLICY_PATH || path === `${PRIVACY_POLICY_PATH}/`) {
    return { meta: buildPrivacyPolicyMeta(siteUrl), content: renderPrivacyPolicyContent() };
  }
  const conversionMatch = path.match(/^\/land-unit-converter\/([^/]+)\/?$/);
  if (conversionMatch) {
    const pair = findConversionPair(conversionMatch[1]);
    return pair
      ? { meta: buildLandConversionMeta(siteUrl, pair), content: renderLandConversionContent(pair) }
      : notFound();
  }
  if (PRIVATE_PATHS.some((pattern) => pattern.test(path))) {
    return { meta: buildNoIndexMeta("Account") };
  }

  const propertyMatch = path.match(/^\/properties\/([^/]+)\/?$/);
  if (propertyMatch) return resolveProperty(url, decodeURIComponent(propertyMatch[1]), siteUrl);

  return notFound();
}

export default async (request: Request, context: Context) => {
  const response = await context.next();
  const isHtml = response.headers.get("content-type")?.includes("text/html");
  if (!isHtml || (request.method !== "GET" && request.method !== "HEAD")) return response;

  const url = new URL(request.url);
  const siteUrl = getSiteUrl(url);

  let result: RouteResult | null = null;
  try {
    result = await resolveRoute(url, siteUrl);
  } catch {
    result = null;
  }
  if (!result) return response;

  if ("redirect" in result) {
    return new Response(null, {
      status: 301,
      headers: { Location: `${siteUrl}${result.redirect}`, ...CACHE_HEADERS },
    });
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("etag");
  for (const [name, value] of Object.entries(CACHE_HEADERS)) headers.set(name, value);

  let body: string | null = null;
  if (request.method !== "HEAD") {
    body = injectHeadTags(await response.text(), result.meta, siteUrl);
    body = injectModulePreloads(body, pageForPath(url.pathname));
    body = injectPageContent(body, result.content ?? "");
    body = injectInitialData(body, result.initialData);
  }
  return new Response(body, { status: result.status ?? 200, headers });
};

export const config: Config = {
  path: "/*",
  excludedPath: [
    "/assets/*",
    "/images/*",
    "/sitemaps/*",
    "/*.xml",
    "/*.txt",
    "/*.ico",
    "/*.svg",
    "/*.png",
    "/*.jpg",
    "/*.webp",
    "/*.js",
    "/*.css",
    "/*.woff",
    "/*.woff2",
  ],
  cache: "manual",
};
