import type { Config, Context } from "@netlify/edge-functions";
import {
  buildHomeMeta,
  buildListingIndexMeta,
  buildNoIndexMeta,
  buildPropertyMeta,
  buildPropertyPath,
  injectHeadTags,
  isUUID,
  parsePropertyPublicId,
  type MetaTags,
  type SeoLocation,
} from "../../src/lib/seo/core.ts";
import { getSiteUrl, supabaseRest } from "../lib/supabase-rest.ts";

/**
 * Renders page-specific <head> tags (title, description, canonical, robots,
 * Open Graph, JSON-LD) into the SPA shell so crawlers and link previews see
 * them without running JavaScript. Also returns real 404/410 status codes and
 * 301s non-canonical listing URLs. Any upstream failure falls back to the
 * untouched page.
 */

const PRIVATE_PATHS = [
  /^\/(login|signup|forgot-password|reset-password|my-properties)\/?$/,
  /^\/admin(\/.*)?$/,
  /^\/properties\/new\/?$/,
  /^\/properties\/[^/]+\/edit\/?$/,
];

const PROPERTY_SELECT = [
  "title",
  "description",
  "price",
  "type",
  "status",
  "area_sqft",
  "area_value",
  "area_unit",
  "property_public_id",
  "created_at",
  "updated_at",
  "locations(display_name,province,district,municipality_or_city,ward,area_name)",
  "property_images(image_url,is_primary,display_order)",
].join(",");

const CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "public, max-age=0, must-revalidate",
  "Netlify-CDN-Cache-Control": "public, durable, s-maxage=600, stale-while-revalidate=86400",
  "Netlify-Vary": "query",
};

interface PropertyRow {
  title: string;
  description: string | null;
  price: number;
  type: string;
  status: string;
  area_sqft: number | null;
  area_value: number | null;
  area_unit: string | null;
  property_public_id: number;
  created_at: string;
  updated_at: string;
  locations: SeoLocation | null;
  property_images: { image_url: string; is_primary: boolean; display_order: number }[] | null;
}

type RouteResult = { meta: MetaTags; status?: number } | { redirect: string };

async function resolveProperty(url: URL, slug: string, siteUrl: string): Promise<RouteResult | null> {
  const publicId = parsePropertyPublicId(slug);
  const filter = publicId ? `property_public_id=eq.${publicId}` : isUUID(slug) ? `id=eq.${slug}` : null;
  if (!filter) return { meta: buildNoIndexMeta("Page Not Found"), status: 404 };

  const result = await supabaseRest<PropertyRow[]>(`properties?select=${PROPERTY_SELECT}&${filter}&limit=1`);
  if (!result) return null;

  const row = result.data[0];
  // Row level security hides drafts and removed listings, so a miss means the listing is gone.
  if (!row) return { meta: buildNoIndexMeta("Property No Longer Available"), status: 410 };

  const canonicalPath = buildPropertyPath(row.title, row.property_public_id);
  if (url.pathname !== canonicalPath) return { redirect: canonicalPath };

  const images = [...(row.property_images ?? [])].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.display_order - b.display_order
  );

  return {
    meta: buildPropertyMeta(siteUrl, {
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
    }),
  };
}

async function resolveRoute(url: URL, siteUrl: string): Promise<RouteResult | null> {
  const path = url.pathname;

  if (path === "/" || path === "/index.html") return { meta: buildHomeMeta(siteUrl) };
  if (path === "/properties" || path === "/properties/") {
    return { meta: buildListingIndexMeta(siteUrl, url.searchParams) };
  }
  if (PRIVATE_PATHS.some((pattern) => pattern.test(path))) {
    return { meta: buildNoIndexMeta("Account") };
  }

  const propertyMatch = path.match(/^\/properties\/([^/]+)\/?$/);
  if (propertyMatch) return resolveProperty(url, decodeURIComponent(propertyMatch[1]), siteUrl);

  return { meta: buildNoIndexMeta("Page Not Found"), status: 404 };
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

  const body = request.method === "HEAD" ? null : injectHeadTags(await response.text(), result.meta, siteUrl);
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
