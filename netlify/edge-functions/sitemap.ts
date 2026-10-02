import type { Config } from "@netlify/edge-functions";
import { buildPropertyPath } from "../../src/lib/seo/core.ts";
import { getSiteUrl, parseTotalCount, supabaseRest } from "../lib/supabase-rest.ts";

/**
 * Sitemap index at /sitemap.xml with one child sitemap per 1,000 listings
 * (the Supabase API page size), plus a sitemap for the static pages.
 */

const PAGE_SIZE = 1000;
const LISTING_FILTER = "status=eq.published&is_deleted=eq.false";

const XML_HEADERS: Record<string, string> = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=0, must-revalidate",
  "Netlify-CDN-Cache-Control": "public, durable, s-maxage=3600, stale-while-revalidate=86400",
};

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

function urlEntry(loc: string, lastmod: string | null): string {
  return `  <url><loc>${escapeXml(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`;
}

function xmlResponse(body: string): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`, { headers: XML_HEADERS });
}

function unavailable(): Response {
  return new Response("Sitemap temporarily unavailable", {
    status: 503,
    headers: { "Retry-After": "3600", "Cache-Control": "no-store" },
  });
}

async function latestUpdate(): Promise<string | null | undefined> {
  const result = await supabaseRest<{ updated_at: string }[]>(
    `properties?select=updated_at&${LISTING_FILTER}&order=updated_at.desc&limit=1`
  );
  if (!result) return undefined;
  return toDate(result.data[0]?.updated_at);
}

async function sitemapIndex(siteUrl: string): Promise<Response> {
  const [countResult, lastmod] = await Promise.all([
    supabaseRest<null>(`properties?select=property_public_id&${LISTING_FILTER}`, { method: "HEAD", count: true }),
    latestUpdate(),
  ]);
  const total = countResult ? parseTotalCount(countResult.headers) : null;
  if (total === null || lastmod === undefined) return unavailable();

  const files = ["pages.xml"];
  for (let i = 1; i <= Math.max(1, Math.ceil(total / PAGE_SIZE)); i++) files.push(`properties-${i}.xml`);

  const entries = files.map(
    (file) =>
      `  <sitemap><loc>${siteUrl}/sitemaps/${file}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</sitemap>`
  );
  return xmlResponse(
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</sitemapindex>`
  );
}

async function pagesSitemap(siteUrl: string): Promise<Response> {
  const lastmod = await latestUpdate();
  if (lastmod === undefined) return unavailable();
  const entries = [urlEntry(`${siteUrl}/`, lastmod), urlEntry(`${siteUrl}/properties`, lastmod)];
  return xmlResponse(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>`);
}

async function propertiesSitemap(siteUrl: string, page: number): Promise<Response> {
  const result = await supabaseRest<{ title: string; property_public_id: number; updated_at: string }[]>(
    `properties?select=title,property_public_id,updated_at&${LISTING_FILTER}` +
      `&order=property_public_id.asc&offset=${(page - 1) * PAGE_SIZE}&limit=${PAGE_SIZE}`
  );
  if (!result) return unavailable();
  if (result.data.length === 0 && page > 1) return new Response("Not found", { status: 404 });

  const entries = result.data.map((row) =>
    urlEntry(`${siteUrl}${buildPropertyPath(row.title, row.property_public_id)}`, toDate(row.updated_at))
  );
  return xmlResponse(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>`);
}

export default async (request: Request) => {
  const url = new URL(request.url);
  const siteUrl = getSiteUrl(url);

  if (url.pathname === "/sitemap.xml") return sitemapIndex(siteUrl);
  if (url.pathname === "/sitemaps/pages.xml") return pagesSitemap(siteUrl);

  const match = url.pathname.match(/^\/sitemaps\/properties-(\d+)\.xml$/);
  if (match && Number(match[1]) >= 1) return propertiesSitemap(siteUrl, Number(match[1]));

  return new Response("Not found", { status: 404 });
};

export const config: Config = {
  path: ["/sitemap.xml", "/sitemaps/*"],
  cache: "manual",
};
