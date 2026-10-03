import type { Config } from "@netlify/edge-functions";
import { buildPropertyPath, LAND_AREA_CALCULATOR_PATH, LAND_CONVERTER_PATH, PRIVACY_POLICY_PATH } from "../../src/lib/seo/core.ts";
import { CONVERSION_PAIRS, conversionPath } from "../../src/lib/land-conversions.ts";
import { PRIVACY_POLICY_UPDATED } from "../../src/lib/privacy-policy.ts";
import { getSiteUrl, supabaseRest } from "../lib/supabase-rest.ts";

/**
 * One sitemap at /sitemap.xml with the static pages and every published
 * listing, including listing photos for Google Images. A single file can hold
 * 50,000 URLs, so a sitemap index is only worth adding if the site gets close
 * to that.
 */

const PAGE_SIZE = 1000; // Supabase returns at most 1,000 rows per request.
const MAX_LISTINGS = 49_000;
const LISTING_FILTER = "status=eq.published&is_deleted=eq.false";

const XML_HEADERS: Record<string, string> = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=0, must-revalidate",
  "Netlify-CDN-Cache-Control": "public, durable, s-maxage=3600, stale-while-revalidate=86400",
};

interface SitemapListing {
  title: string;
  property_public_id: number;
  updated_at: string;
  property_images: { image_url: string; is_primary: boolean; display_order: number | null }[] | null;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toDate(value: string | null | undefined): string | null {
  return value ? value.split("T")[0] : null;
}

function urlEntry(loc: string, lastmod: string | null, images: string[] = []): string {
  const imageTags = images.map((image) => `<image:image><image:loc>${escapeXml(image)}</image:loc></image:image>`);
  return `  <url><loc>${escapeXml(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}${imageTags.join("")}</url>`;
}

/** Listing photos, main photo first, so Google Images can find them without rendering the gallery. */
function listingImages(row: SitemapListing): string[] {
  return [...(row.property_images ?? [])]
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((img) => img.image_url);
}

async function fetchListings(): Promise<SitemapListing[] | null> {
  const listings: SitemapListing[] = [];
  while (listings.length < MAX_LISTINGS) {
    const limit = Math.min(PAGE_SIZE, MAX_LISTINGS - listings.length);
    const result = await supabaseRest<SitemapListing[]>(
      `properties?select=title,property_public_id,updated_at,property_images(image_url,is_primary,display_order)` +
        `&${LISTING_FILTER}&order=property_public_id.asc&offset=${listings.length}&limit=${limit}`
    );
    if (!result) return null;
    listings.push(...result.data);
    if (result.data.length < limit) break;
  }
  return listings;
}

async function sitemap(siteUrl: string): Promise<Response> {
  const listings = await fetchListings();
  if (!listings) {
    return new Response("Sitemap temporarily unavailable", {
      status: 503,
      headers: { "Retry-After": "3600", "Cache-Control": "no-store" },
    });
  }

  const latest = listings.reduce<string | null>((max, row) => (!max || row.updated_at > max ? row.updated_at : max), null);
  const lastmod = toDate(latest);
  const entries = [
    urlEntry(`${siteUrl}/`, lastmod),
    urlEntry(`${siteUrl}/properties`, lastmod),
    urlEntry(`${siteUrl}${LAND_CONVERTER_PATH}`, null),
    ...CONVERSION_PAIRS.map((pair) => urlEntry(`${siteUrl}${conversionPath(pair)}`, null)),
    urlEntry(`${siteUrl}${LAND_AREA_CALCULATOR_PATH}`, null),
    urlEntry(`${siteUrl}${PRIVACY_POLICY_PATH}`, PRIVACY_POLICY_UPDATED),
    ...listings.map((row) =>
      urlEntry(`${siteUrl}${buildPropertyPath(row.title, row.property_public_id)}`, toDate(row.updated_at), listingImages(row))
    ),
  ];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
      `${entries.join("\n")}\n</urlset>\n`,
    { headers: XML_HEADERS }
  );
}

export default async (request: Request) => {
  const url = new URL(request.url);
  if (url.pathname === "/sitemap.xml") return sitemap(getSiteUrl(url));

  // The sitemap used to be split into /sitemaps/*.xml files; tell crawlers they are gone.
  return new Response("Gone", { status: 410, headers: { "Cache-Control": "public, max-age=86400" } });
};

export const config: Config = {
  path: ["/sitemap.xml", "/sitemaps/*"],
  cache: "manual",
};
