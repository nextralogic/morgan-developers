/**
 * Framework-agnostic SEO helpers shared by the React app and the Netlify edge
 * functions. Keep this file free of imports so it can run in Deno as well.
 */

export const SITE_NAME = "Morgan Developers";
export const DEFAULT_OG_IMAGE_PATH = "/og-default.jpg";
export const DEFAULT_OG_IMAGE_ALT = "Kathmandu Valley skyline with the Himalayas";

/** Public business details used in structured data. Leave a field empty until it is confirmed. */
export const BUSINESS = {
  name: SITE_NAME,
  email: "info@morgandevelopers.com",
  telephone: "",
  streetAddress: "",
  locality: "Kathmandu",
  region: "Bagmati Province",
  country: "NP",
  sameAs: [] as string[],
};

export const HERO_IMAGE = {
  src: "/images/hero-1344.webp",
  srcSet: "/images/hero-640.webp 640w, /images/hero-960.webp 960w, /images/hero-1344.webp 1344w",
  sizes: "100vw",
  width: 1344,
  height: 768,
};

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 158;

export type JsonLd = Record<string, unknown>;

export interface MetaTags {
  title: string;
  description?: string;
  canonical?: string;
  robots?: string;
  ogType?: "website" | "article";
  ogImage?: string;
  ogImageAlt?: string;
  jsonLd?: JsonLd[];
  preloadImage?: { srcSet: string; sizes: string; href: string };
}

export interface SeoLocation {
  display_name?: string | null;
  province?: string | null;
  district?: string | null;
  municipality_or_city?: string | null;
  ward?: number | null;
  area_name?: string | null;
}

export interface SeoProperty {
  title: string;
  description?: string | null;
  price: number;
  type: string;
  status?: string | null;
  areaSqft?: number | null;
  areaValue?: number | null;
  areaUnit?: string | null;
  propertyPublicId: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  imageUrls?: string[];
  location?: SeoLocation | null;
}

// ─── URLs ───────────────────────────────────────────────────────────────────

export function generatePropertySlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function buildPropertyPath(title: string, propertyPublicId: number): string {
  const slug = generatePropertySlug(title);
  return slug ? `/properties/${slug}-${propertyPublicId}` : `/properties/property-${propertyPublicId}`;
}

export function parsePropertyPublicId(param: string): number | null {
  const match = param.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

export function isUUID(param: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param);
}

// ─── Text helpers ───────────────────────────────────────────────────────────

/** Shorten text on a word boundary, only when it is longer than `max`. */
export function truncateText(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.-]+$/, "")}…`;
}

/** Append the brand when it still fits in a search result title. */
export function withBrand(title: string): string {
  const branded = `${title} | ${SITE_NAME}`;
  return branded.length <= TITLE_MAX ? branded : title;
}

const TYPE_LABELS: Record<string, string> = {
  apartment: "Apartment",
  house: "House",
  land: "Land",
};

const AREA_UNIT_LABELS: Record<string, string> = {
  sq_feet: "sq ft",
  sq_meter: "sq m",
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

export function propertyTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1);
}

function trimNumber(value: number): string {
  return Number(value.toFixed(2)).toString();
}

/** NPR in the lakh/crore style buyers search with, e.g. "NPR 50 Lakh". */
export function formatNprShort(price: number): string {
  if (price >= 10_000_000) return `NPR ${trimNumber(price / 10_000_000)} Crore`;
  if (price >= 100_000) return `NPR ${trimNumber(price / 100_000)} Lakh`;
  return `NPR ${Math.round(price).toLocaleString("en-US")}`;
}

export function formatArea(p: Pick<SeoProperty, "areaValue" | "areaUnit" | "areaSqft">): string | null {
  if (p.areaValue && p.areaUnit) {
    return `${trimNumber(p.areaValue)} ${AREA_UNIT_LABELS[p.areaUnit] ?? p.areaUnit}`;
  }
  if (p.areaSqft) return `${Math.round(p.areaSqft).toLocaleString("en-US")} sq ft`;
  return null;
}

/** Most specific place name first, e.g. "Danchhi, Kathmandu". */
export function formatPlace(location?: SeoLocation | null): string {
  if (!location) return "Nepal";
  const local = location.area_name || location.municipality_or_city;
  const parts = [local, location.district].filter(
    (part, i, all): part is string => !!part && all.indexOf(part) === i
  );
  return parts.length > 0 ? parts.join(", ") : location.display_name || "Nepal";
}

// ─── Page metadata ──────────────────────────────────────────────────────────

export function buildHomeMeta(siteUrl: string): MetaTags {
  return {
    title: withBrand("Property for Sale in Kathmandu & Nepal"),
    description:
      "Find land, houses and apartments for sale in Kathmandu Valley and across Nepal. Compare prices in NPR, view photos and enquire directly with Morgan Developers.",
    canonical: `${siteUrl}/`,
    ogType: "website",
    jsonLd: [buildOrganizationJsonLd(siteUrl), buildWebSiteJsonLd(siteUrl)],
    preloadImage: { href: HERO_IMAGE.src, srcSet: HERO_IMAGE.srcSet, sizes: HERO_IMAGE.sizes },
  };
}

const LISTING_FILTER_KEYS = ["q", "type", "province", "district", "municipality", "minPrice", "maxPrice", "minArea", "maxArea", "sort"];

/**
 * Plain pagination stays indexable with a self-referencing canonical. Filtered,
 * sorted or searched views are kept out of the index to avoid near-duplicates.
 */
export function buildListingIndexMeta(siteUrl: string, params: URLSearchParams): MetaTags {
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
  const isFiltered = LISTING_FILTER_KEYS.some((key) => params.has(key));
  const pageSuffix = page > 1 ? ` – Page ${page}` : "";

  return {
    title: withBrand(`Land & Houses for Sale in Nepal${pageSuffix}`),
    description:
      "Browse land, houses and apartments for sale across Nepal, from Kathmandu Valley to Pokhara, Chitwan and the Terai. Filter by location, property type and price.",
    canonical: !isFiltered && page > 1 ? `${siteUrl}/properties?page=${page}` : `${siteUrl}/properties`,
    robots: isFiltered ? "noindex, follow" : undefined,
    ogType: "website",
    jsonLd: [
      buildBreadcrumbJsonLd([
        { name: "Home", url: `${siteUrl}/` },
        { name: "Properties", url: `${siteUrl}/properties` },
      ]),
    ],
  };
}

export function buildPropertyTitle(p: SeoProperty): string {
  const type = propertyTypeLabel(p.type);
  const place = formatPlace(p.location);
  const price = formatNprShort(p.price);
  const area = formatArea(p);

  const candidates = [
    area ? `${area} ${type} for Sale in ${place} – ${price}` : null,
    `${type} for Sale in ${place} – ${price}`,
    `${type} for Sale in ${place}`,
  ].filter((c): c is string => !!c);

  const fitting = candidates.find((c) => c.length <= TITLE_MAX) ?? truncateText(candidates[candidates.length - 1], TITLE_MAX);
  return withBrand(fitting);
}

export function buildPropertyDescription(p: SeoProperty): string {
  const type = propertyTypeLabel(p.type).toLowerCase();
  const place = formatPlace(p.location);
  const area = formatArea(p);
  const facts = [`${area ? `${area} ` : ""}${type} for sale in ${place}`, `priced at ${formatNprShort(p.price)}`].join(", ");
  const lead = `${facts.charAt(0).toUpperCase()}${facts.slice(1)}.`;
  const body = p.description?.trim() ? ` ${p.description.trim()}` : ` View photos and location details, and enquire with ${SITE_NAME}.`;
  return truncateText(`${lead}${body}`, DESCRIPTION_MAX);
}

export function buildPropertyMeta(siteUrl: string, p: SeoProperty): MetaTags {
  const url = `${siteUrl}${buildPropertyPath(p.title, p.propertyPublicId)}`;
  return {
    title: buildPropertyTitle(p),
    description: buildPropertyDescription(p),
    canonical: url,
    ogType: "article",
    ogImage: p.imageUrls?.[0],
    ogImageAlt: p.title,
    jsonLd: [
      buildPropertyJsonLd(siteUrl, p),
      buildBreadcrumbJsonLd([
        { name: "Home", url: `${siteUrl}/` },
        { name: "Properties", url: `${siteUrl}/properties` },
        { name: p.title, url },
      ]),
    ],
  };
}

export function buildNoIndexMeta(title: string, description?: string): MetaTags {
  return { title: withBrand(title), description, robots: "noindex, follow" };
}

// ─── Structured data ────────────────────────────────────────────────────────

export function buildOrganizationJsonLd(siteUrl: string): JsonLd {
  const address: JsonLd = {
    "@type": "PostalAddress",
    addressLocality: BUSINESS.locality,
    addressRegion: BUSINESS.region,
    addressCountry: BUSINESS.country,
  };
  if (BUSINESS.streetAddress) address.streetAddress = BUSINESS.streetAddress;

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": `${siteUrl}/#organization`,
    name: BUSINESS.name,
    url: `${siteUrl}/`,
    image: `${siteUrl}${DEFAULT_OG_IMAGE_PATH}`,
    email: BUSINESS.email,
    ...(BUSINESS.telephone ? { telephone: BUSINESS.telephone } : {}),
    address,
    areaServed: { "@type": "Country", name: "Nepal" },
    ...(BUSINESS.sameAs.length > 0 ? { sameAs: BUSINESS.sameAs } : {}),
  };
}

export function buildWebSiteJsonLd(siteUrl: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: `${siteUrl}/`,
    name: SITE_NAME,
    inLanguage: "en",
    publisher: { "@id": `${siteUrl}/#organization` },
  };
}

export function buildBreadcrumbJsonLd(items: { name: string; url: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

const ITEM_TYPES: Record<string, string> = {
  apartment: "Apartment",
  house: "SingleFamilyResidence",
  land: "Place",
};

export function buildPropertyJsonLd(siteUrl: string, p: SeoProperty): JsonLd {
  const url = `${siteUrl}${buildPropertyPath(p.title, p.propertyPublicId)}`;
  const loc = p.location;

  const address: JsonLd = { "@type": "PostalAddress", addressCountry: "NP" };
  const street = [loc?.area_name, loc?.ward ? `Ward ${loc.ward}` : null].filter(Boolean).join(", ");
  if (street) address.streetAddress = street;
  if (loc?.municipality_or_city) address.addressLocality = loc.municipality_or_city;
  if (loc?.district || loc?.province) address.addressRegion = [loc?.district, loc?.province].filter(Boolean).join(", ");

  const item: JsonLd = {
    "@type": ITEM_TYPES[p.type] ?? "Place",
    name: p.title,
    address,
  };
  if (p.areaValue && p.areaUnit) {
    item.additionalProperty = {
      "@type": "PropertyValue",
      name: "Area",
      value: p.areaValue,
      unitText: AREA_UNIT_LABELS[p.areaUnit] ?? p.areaUnit,
    };
  } else if (p.areaSqft) {
    item.additionalProperty = {
      "@type": "PropertyValue",
      name: "Area",
      value: p.areaSqft,
      unitCode: "FTK",
      unitText: "sq ft",
    };
  }

  const description = p.description?.trim() || buildPropertyDescription(p);

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "@id": `${url}#listing`,
    name: p.title,
    description,
    url,
    ...(p.imageUrls && p.imageUrls.length > 0 ? { image: p.imageUrls.slice(0, 6) } : {}),
    ...(p.createdAt ? { datePosted: p.createdAt.split("T")[0] } : {}),
    ...(p.updatedAt ? { dateModified: p.updatedAt } : {}),
    inLanguage: "en",
    offers: {
      "@type": "Offer",
      url,
      price: p.price,
      priceCurrency: "NPR",
      availability: p.status === "sold" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      itemOffered: item,
      seller: { "@id": `${siteUrl}/#organization` },
    },
    provider: { "@id": `${siteUrl}/#organization` },
  };
}

// ─── HTML rendering (used by the edge function) ─────────────────────────────

export const HEAD_START = "<!--seo-->";
export const HEAD_END = "<!--/seo-->";

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** JSON-LD inside a script tag must not be able to close the tag early. */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function renderHeadTags(meta: MetaTags, siteUrl: string): string {
  const ogImage = meta.ogImage ?? `${siteUrl}${DEFAULT_OG_IMAGE_PATH}`;
  const ogImageAlt = meta.ogImageAlt ?? DEFAULT_OG_IMAGE_ALT;
  const description = meta.description ?? "";
  const tags = [
    `<title>${escapeText(meta.title)}</title>`,
    description ? `<meta name="description" content="${escapeAttr(description)}" />` : "",
    meta.robots ? `<meta name="robots" content="${escapeAttr(meta.robots)}" />` : "",
    meta.canonical ? `<link rel="canonical" href="${escapeAttr(meta.canonical)}" />` : "",
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:type" content="${meta.ogType ?? "website"}" />`,
    `<meta property="og:title" content="${escapeAttr(meta.title)}" />`,
    description ? `<meta property="og:description" content="${escapeAttr(description)}" />` : "",
    meta.canonical ? `<meta property="og:url" content="${escapeAttr(meta.canonical)}" />` : "",
    `<meta property="og:image" content="${escapeAttr(ogImage)}" />`,
    `<meta property="og:image:alt" content="${escapeAttr(ogImageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(meta.title)}" />`,
    description ? `<meta name="twitter:description" content="${escapeAttr(description)}" />` : "",
    `<meta name="twitter:image" content="${escapeAttr(ogImage)}" />`,
    meta.preloadImage
      ? `<link rel="preload" as="image" href="${meta.preloadImage.href}" imagesrcset="${meta.preloadImage.srcSet}" imagesizes="${meta.preloadImage.sizes}" fetchpriority="high" />`
      : "",
    ...(meta.jsonLd ?? []).map((data) => `<script type="application/ld+json" data-seo>${serializeJsonLd(data)}</script>`),
  ];
  return tags.filter(Boolean).join("\n    ");
}

/** Replace the default head block in index.html with page-specific tags. */
export function injectHeadTags(html: string, meta: MetaTags, siteUrl: string): string {
  const start = html.indexOf(HEAD_START);
  const end = html.indexOf(HEAD_END);
  if (start === -1 || end === -1 || end < start) return html;
  return `${html.slice(0, start + HEAD_START.length)}\n    ${renderHeadTags(meta, siteUrl)}\n    ${html.slice(end)}`;
}
