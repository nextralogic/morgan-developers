import { describe, expect, it } from "vitest";
import { buildPropertyMeta, injectHeadTags, type SeoProperty } from "@/lib/seo/core";
import {
  injectInitialData,
  injectPageContent,
  LISTING_PAGE_SIZE,
  listingCardImage,
  renderListingIndexContent,
  renderPropertyContent,
  type ListingSummary,
} from "../../netlify/lib/page-content.ts";

const SITE = "https://morgandevelopers.com";
const SHELL = '<html><head><!--seo--><title>x</title><!--/seo--></head><body><div id="root"></div></body></html>';

const house: SeoProperty = {
  title: "House <b>near</b> Ring Road",
  description: "Four bedrooms & parking.\n\nWalking distance to school.",
  price: 32_500_000,
  type: "house",
  areaValue: 5,
  areaUnit: "aana",
  propertyPublicId: 1031,
  imageUrls: ["https://x.supabase.co/storage/v1/object/public/property-images/u/main.webp"],
  location: { area_name: "Gothatar", district: "Kathmandu" },
};

function listing(id: number, images: ListingSummary["property_images"] = null): ListingSummary {
  return {
    title: `Land ${id}`,
    price: 5_000_000,
    type: "land",
    area_sqft: null,
    area_value: 4,
    area_unit: "aana",
    property_public_id: id,
    locations: { district: "Lalitpur" },
    property_images: images,
  };
}

describe("page content for crawlers", () => {
  it("puts hidden content inside the React root", () => {
    const html = injectPageContent(SHELL, "<h1>Hello</h1>");
    expect(html).toMatch(/<div id="root"><div style="position:absolute;[^"]*"><h1>Hello<\/h1><\/div><\/div>/);
    expect(injectPageContent("<div id=\"app\"></div>", "<h1>Hello</h1>")).toBe('<div id="app"></div>');
  });

  it("renders listing facts and escapes user text", () => {
    const html = renderPropertyContent(house);
    expect(html).toContain("<h1>House &lt;b&gt;near&lt;/b&gt; Ring Road</h1>");
    expect(html).toContain("NPR 3.25 Crore · House · 5 Aana · Gothatar, Kathmandu");
    expect(html).toContain("<p>Four bedrooms &amp; parking.</p><p>Walking distance to school.</p>");
  });

  it("shows the plot size in local units with the price per unit for land", () => {
    const land = renderPropertyContent({ ...house, type: "land", price: 5_000_000, areaValue: 12 });
    expect(land).toContain("<li>4,107 square feet (381.55 square metres)</li>");
    expect(land).toContain("<li>Ropani-Aana-Paisa-Daam: 0-12-0-0</li>");
    expect(land).toContain("<li>Bigha-Kattha-Dhur: 0-1-2.53</li>");
    expect(land).toContain("<li>Price: NPR 4.17 Lakh per aana</li>");
    expect(land).toContain('<a href="/land-unit-converter/aana-to-square-feet">Aana to Square Feet converter</a>');

    expect(renderPropertyContent(house)).not.toContain("Price:");
    expect(renderPropertyContent({ ...house, areaUnit: "sq_meter" })).toContain('<a href="/land-unit-converter">Land unit converter</a>');
    expect(renderPropertyContent({ ...house, areaValue: null })).not.toContain("Land size");
  });

  it("embeds initial data that cannot close its script tag", () => {
    const html = injectInitialData(SHELL, { "property:x-1": { title: "</script><b>x</b>" } });
    expect(html).toContain(
      '<script id="initial-data" type="application/json">{"property:x-1":{"title":"\\u003c/script>\\u003cb>x\\u003c/b>"}}</script></body>'
    );
    expect(injectInitialData(SHELL)).toBe(SHELL);
  });

  it("links listings and pagination", () => {
    const full = Array.from({ length: LISTING_PAGE_SIZE }, (_, i) => listing(1000 + i));
    const page2 = renderListingIndexContent(full, 2);
    expect(page2).toContain('<a href="/properties/land-1000-1000">Land 1000</a>');
    expect(page2).toContain('<a href="/properties">Previous page</a>');
    expect(page2).toContain('<a href="/properties?page=3">Next page</a>');
    expect(renderListingIndexContent(full.slice(0, 3), 1)).not.toContain("Next page");
  });

  it("picks the card image the same way the listing card does", () => {
    const images = [
      { image_url: "a.webp", is_primary: false },
      { image_url: "b.webp", is_primary: true },
    ];
    expect(listingCardImage(listing(1, images))).toBe("b.webp");
    expect(listingCardImage(listing(1, [images[0]]))).toBe("a.webp");
    expect(listingCardImage(listing(1))).toBeNull();
  });

  it("preloads the main listing photo", () => {
    const html = injectHeadTags(SHELL, buildPropertyMeta(SITE, house), SITE);
    expect(html).toContain(
      '<link rel="preload" as="image" href="https://x.supabase.co/storage/v1/object/public/property-images/u/main.webp" fetchpriority="high" />'
    );
  });
});
