import { AREA_UNITS, listingAreaSqft, sqftToNepali, sqftToTerai, type AreaUnit } from "../../src/lib/area-utils.ts";
import {
  CONVERSION_PAIRS,
  conversionFactor,
  conversionPath,
  converterPairForUnit,
  exampleAmount,
  formatConverted,
  UNIT_NAMES,
  unitName,
  type ConversionPair,
} from "../../src/lib/land-conversions.ts";
import {
  buildPropertyPath,
  escapeHtml,
  formatArea,
  formatNprShort,
  formatPlace,
  formatPricePerUnit,
  LAND_CONVERTER_PATH,
  propertyTypeLabel,
  type SeoLocation,
  type SeoProperty,
} from "../../src/lib/seo/core.ts";

/**
 * Plain HTML version of the main page content, placed inside #root so crawlers
 * that do not run JavaScript still see headings, text and links. React replaces
 * it on first render, and it is visually hidden until then so the layout does
 * not jump.
 */

export const LISTING_PAGE_SIZE = 12;

export const LISTING_SUMMARY_SELECT = [
  "title",
  "price",
  "type",
  "area_sqft",
  "area_value",
  "area_unit",
  "property_public_id",
  "locations(display_name,province,district,municipality_or_city,ward,area_name)",
  "property_images(image_url,is_primary)",
].join(",");

export interface ListingSummary {
  title: string;
  price: number;
  type: string;
  area_sqft: number | null;
  area_value: number | null;
  area_unit: string | null;
  property_public_id: number;
  locations: SeoLocation | null;
  property_images: { image_url: string; is_primary: boolean }[] | null;
}

const HIDDEN_STYLE =
  "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";

const ROOT_EMPTY = '<div id="root"></div>';

const SITE_NAV = [
  '<nav aria-label="Site">',
  '<a href="/">Home</a>',
  '<a href="/properties">Property for sale in Nepal</a>',
  `<a href="${LAND_CONVERTER_PATH}">Land unit converter</a>`,
  "</nav>",
].join(" ");

/** The photo a listing card shows: the primary image, otherwise the first one. */
export function listingCardImage(listing: ListingSummary): string | null {
  const images = listing.property_images ?? [];
  return (images.find((img) => img.is_primary) ?? images[0])?.image_url ?? null;
}

function listingFacts(p: Pick<SeoProperty, "price" | "type" | "areaValue" | "areaUnit" | "areaSqft" | "location">): string {
  return [formatNprShort(p.price), propertyTypeLabel(p.type), formatArea(p), formatPlace(p.location)]
    .filter(Boolean)
    .join(" · ");
}

function renderListingList(listings: ListingSummary[]): string {
  const items = listings.map((l) => {
    const facts = listingFacts({
      price: Number(l.price),
      type: l.type,
      areaValue: l.area_value ? Number(l.area_value) : null,
      areaUnit: l.area_unit,
      areaSqft: l.area_sqft ? Number(l.area_sqft) : null,
      location: l.locations,
    });
    const href = buildPropertyPath(l.title, l.property_public_id);
    return `<li><a href="${escapeHtml(href)}">${escapeHtml(l.title)}</a> – ${escapeHtml(facts)}</li>`;
  });
  return `<ul>${items.join("")}</ul>`;
}

function paragraphs(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function renderHomeContent(latest: ListingSummary[]): string {
  return [
    SITE_NAV,
    "<main>",
    "<h1>Land, Houses &amp; Apartments for Sale across Nepal</h1>",
    "<p>Premium apartments, houses, and land - curated for discerning buyers across Kathmandu Valley and beyond.</p>",
    latest.length > 0 ? `<h2>Latest properties</h2>${renderListingList(latest)}` : "",
    '<p><a href="/properties">Browse all property for sale</a></p>',
    "</main>",
  ].join("");
}

export function renderListingIndexContent(listings: ListingSummary[], page: number): string {
  const prev = page > 1 ? `<a href="/properties${page > 2 ? `?page=${page - 1}` : ""}">Previous page</a>` : "";
  const next = listings.length === LISTING_PAGE_SIZE ? `<a href="/properties?page=${page + 1}">Next page</a>` : "";
  return [
    SITE_NAV,
    "<main>",
    `<h1>Property for Sale in Nepal${page > 1 ? ` – Page ${page}` : ""}</h1>`,
    listings.length > 0 ? renderListingList(listings) : "<p>No properties are listed right now.</p>",
    prev || next ? `<nav aria-label="Pagination">${[prev, next].filter(Boolean).join(" ")}</nav>` : "",
    "</main>",
  ].join("");
}

export function renderPropertyContent(p: SeoProperty): string {
  return [
    SITE_NAV,
    "<main>",
    '<nav aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/properties">Properties</a></nav>',
    `<h1>${escapeHtml(p.title)}</h1>`,
    `<p>${escapeHtml(listingFacts(p))}</p>`,
    p.description?.trim() ? paragraphs(p.description) : "",
    renderLandSize(p),
    '<p><a href="/properties">See more property for sale</a></p>',
    "</main>",
  ].join("");
}

/** The plot size in both local systems, the price per unit, and a link to the matching converter. */
function renderLandSize(p: SeoProperty): string {
  const sqft = listingAreaSqft(p.areaSqft, p.areaValue, p.areaUnit);
  if (!sqft) return "";
  const hill = sqftToNepali(sqft);
  const terai = sqftToTerai(sqft);
  const perUnit = formatPricePerUnit(p);
  const pair = converterPairForUnit(p.areaUnit);
  const converter = pair
    ? `<a href="${conversionPath(pair)}">${UNIT_NAMES[pair.from].title} to ${UNIT_NAMES[pair.to].title} converter</a>`
    : `<a href="${LAND_CONVERTER_PATH}">Land unit converter</a>`;
  return [
    "<h2>Land size</h2>",
    "<ul>",
    `<li>${formatConverted(sqft)} square feet (${formatConverted(sqft / AREA_UNITS.sq_meter.toSqft)} square metres)</li>`,
    `<li>Ropani-Aana-Paisa-Daam: ${hill.ropani}-${hill.anna}-${hill.paisa}-${hill.dam}</li>`,
    `<li>Bigha-Kattha-Dhur: ${terai.bigha}-${terai.kattha}-${formatConverted(terai.dhur)}</li>`,
    perUnit ? `<li>Price: ${perUnit}</li>` : "",
    "</ul>",
    `<p>${converter}</p>`,
  ].join("");
}

function renderUnitTable(units: AreaUnit[]): string {
  const sqftPerSqm = AREA_UNITS.sq_meter.toSqft;
  const rows = units.map((unit) => {
    const sqft = AREA_UNITS[unit].toSqft;
    const name = unit.charAt(0).toUpperCase() + unit.slice(1);
    const fmt = (n: number) => Number(n.toFixed(2)).toLocaleString("en-US");
    return `<tr><td>1 ${name}</td><td>${fmt(sqft)}</td><td>${fmt(sqft / sqftPerSqm)}</td></tr>`;
  });
  return `<table><thead><tr><th>Unit</th><th>Square feet</th><th>Square metres</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

export function renderLandConverterContent(): string {
  return [
    SITE_NAV,
    "<main>",
    "<h1>Nepali Land Unit Converter</h1>",
    "<p>Convert ropani, aana, paisa, daam, bigha, kattha and dhur to square feet, square metres and acres. Enter a value in any unit to see it in every other unit.</p>",
    "<h2>Hill system (Kathmandu Valley and hill districts)</h2>",
    "<p>Ropani, aana, paisa and daam are used for land in the Kathmandu Valley and most hill districts. 1 ropani = 16 aana, 1 aana = 4 paisa and 1 paisa = 4 daam.</p>",
    renderUnitTable(["ropani", "aana", "paisa", "daam"]),
    "<h2>Terai system (southern plains)</h2>",
    "<p>Bigha, kattha and dhur are used in the Terai, for example in Chitwan, Rupandehi, Morang and Kailali. 1 bigha = 20 kattha and 1 kattha = 20 dhur.</p>",
    renderUnitTable(["bigha", "kattha", "dhur"]),
    "<h2>Popular conversions</h2>",
    renderConversionLinks(),
    '<p><a href="/properties">Browse land for sale</a></p>',
    "</main>",
  ].join("");
}

function renderConversionLinks(current?: ConversionPair): string {
  const items = CONVERSION_PAIRS.filter((pair) => pair !== current).map(
    (pair) => `<li><a href="${conversionPath(pair)}">${UNIT_NAMES[pair.from].title} to ${UNIT_NAMES[pair.to].title}</a></li>`
  );
  return `<ul>${items.join("")}</ul>`;
}

export function renderLandConversionContent(pair: ConversionPair): string {
  const from = UNIT_NAMES[pair.from];
  const to = UNIT_NAMES[pair.to];
  const factor = conversionFactor(pair);
  const example = exampleAmount(pair);
  const exampleResult = `${formatConverted(example * factor)} ${unitName(pair.to, example * factor)}`;
  const formula =
    factor >= 1
      ? `To convert ${from.other} to ${to.other}, multiply the number of ${from.other} by ${formatConverted(factor)}. ` +
        `For example, ${formatConverted(example)} × ${formatConverted(factor)} = ${exampleResult}.`
      : `To convert ${from.other} to ${to.other}, divide the number of ${from.other} by ${formatConverted(1 / factor)}. ` +
        `For example, ${formatConverted(example)} ÷ ${formatConverted(1 / factor)} = ${exampleResult}.`;
  const spellings = [pair.from, pair.to]
    .filter((unit) => UNIT_NAMES[unit].alias)
    .map((unit) => `${UNIT_NAMES[unit].title} is also written ${UNIT_NAMES[unit].alias}.`);
  const rows = pair.amounts.map(
    (amount) =>
      `<tr><td>${formatConverted(amount)} ${unitName(pair.from, amount)}</td>` +
      `<td>${formatConverted(amount * factor)} ${unitName(pair.to, amount * factor)}</td></tr>`
  );
  return [
    SITE_NAV,
    "<main>",
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> › <a href="${LAND_CONVERTER_PATH}">Land unit converter</a></nav>`,
    `<h1>${from.title} to ${to.title} Converter</h1>`,
    `<p>1 ${from.one} = ${formatConverted(factor)} ${unitName(pair.to, factor)}</p>`,
    `<p>1 ${to.one} = ${formatConverted(1 / factor)} ${unitName(pair.from, 1 / factor)}</p>`,
    spellings.length > 0 ? `<p>${spellings.join(" ")}</p>` : "",
    `<h2>How to convert ${from.other} to ${to.other}</h2>`,
    `<p>${formula}</p>`,
    `<h2>${from.title} to ${to.title} conversion table</h2>`,
    `<table><thead><tr><th>${from.title}</th><th>${to.title}</th></tr></thead><tbody>${rows.join("")}</tbody></table>`,
    "<h2>Other land unit conversions</h2>",
    renderConversionLinks(pair),
    `<p><a href="${LAND_CONVERTER_PATH}">Convert between every unit in the full land unit converter</a></p>`,
    '<p><a href="/properties">Browse land for sale</a></p>',
    "</main>",
  ].join("");
}

export function renderNotFoundContent(gone: boolean): string {
  const message = gone
    ? "This property has been sold or is no longer listed."
    : "The page you are looking for does not exist.";
  return [
    SITE_NAV,
    "<main>",
    `<h1>${gone ? "Property No Longer Available" : "Page Not Found"}</h1>`,
    `<p>${message} <a href="/properties">Browse property for sale</a>.</p>`,
    "</main>",
  ].join("");
}

/** Put the content inside the empty React root of the built index.html. */
export function injectPageContent(html: string, content: string): string {
  if (!content || !html.includes(ROOT_EMPTY)) return html;
  return html.replace(ROOT_EMPTY, () => `<div id="root"><div style="${HIDDEN_STYLE}">${content}</div></div>`);
}
