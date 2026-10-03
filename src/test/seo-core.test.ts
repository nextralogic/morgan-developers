import { describe, expect, it } from "vitest";
import {
  buildHomeMeta,
  buildLandConverterMeta,
  buildListingIndexMeta,
  buildPropertyMeta,
  buildPropertyPath,
  formatArea,
  formatNprShort,
  formatPricePerUnit,
  injectHeadTags,
  parsePropertyPublicId,
  truncateText,
  type SeoProperty,
} from "@/lib/seo/core";
import { getThumbnailUrl } from "@/lib/image-url";
import { AREA_UNITS, sqftToNepali, sqftToTerai } from "@/lib/area-utils";

const SITE = "https://morgandevelopers.com";

const land: SeoProperty = {
  title: "Beautiful Land in Danchhi",
  description: "Land at danchhi chowk",
  price: 5_000_000,
  type: "land",
  status: "published",
  areaValue: 12,
  areaUnit: "aana",
  propertyPublicId: 1023,
  createdAt: "2026-10-01T08:00:00Z",
  updatedAt: "2026-10-01T09:00:00Z",
  imageUrls: ["https://x.supabase.co/storage/v1/object/public/property-images/u/1.webp"],
  location: {
    area_name: "Danchhi",
    municipality_or_city: "Kageshwori-Manohara Municipality",
    district: "Kathmandu",
    province: "Bagmati Province",
    ward: null,
  },
};

describe("text helpers", () => {
  it("does not cut short text", () => {
    expect(truncateText("Land at danchhi chowk", 155)).toBe("Land at danchhi chowk");
  });

  it("cuts long text on a word boundary", () => {
    const result = truncateText("word ".repeat(60), 50);
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result.endsWith("…")).toBe(true);
  });

  it("formats prices the way buyers search for them", () => {
    expect(formatNprShort(5_000_000)).toBe("NPR 50 Lakh");
    expect(formatNprShort(12_500_000)).toBe("NPR 1.25 Crore");
    expect(formatNprShort(85_000)).toBe("NPR 85,000");
  });

  it("formats areas with thousands separators", () => {
    expect(formatArea({ areaValue: 2250, areaUnit: "sq_feet" })).toBe("2,250 sq ft");
    expect(formatArea({ areaValue: 12, areaUnit: "aana" })).toBe("12 Aana");
  });

  it("quotes land prices per aana, per kattha or per sq ft", () => {
    expect(formatPricePerUnit(land)).toBe("NPR 4.17 Lakh per aana");
    expect(formatPricePerUnit({ ...land, price: 41_000_000, areaValue: 10, areaUnit: "kattha" })).toBe("NPR 41 Lakh per kattha");
    expect(formatPricePerUnit({ ...land, price: 21_400_000, areaValue: 2250, areaUnit: "sq_feet" })).toBe("NPR 9,511 per sq ft");
    expect(formatPricePerUnit({ ...land, areaValue: 2, areaUnit: "ropani" })).toBe("NPR 1.56 Lakh per aana");
    expect(formatPricePerUnit({ ...land, type: "house" })).toBeNull();
    expect(formatPricePerUnit({ ...land, areaValue: null, areaUnit: null })).toBeNull();
  });
});

describe("property URLs", () => {
  it("round-trips the public id", () => {
    const path = buildPropertyPath(land.title, land.propertyPublicId);
    expect(path).toBe("/properties/beautiful-land-in-danchhi-1023");
    expect(parsePropertyPublicId(path.replace("/properties/", ""))).toBe(1023);
  });

  it("still produces a usable path for non-latin titles", () => {
    expect(buildPropertyPath("काठमाडौंमा घर", 7)).toBe("/properties/property-7");
  });
});

describe("page metadata", () => {
  it("keeps titles and descriptions within search result limits", () => {
    for (const meta of [
      buildHomeMeta(SITE),
      buildListingIndexMeta(SITE, new URLSearchParams()),
      buildPropertyMeta(SITE, land),
    ]) {
      expect(meta.title.length).toBeLessThanOrEqual(60);
      expect(meta.description!.length).toBeGreaterThan(50);
      expect(meta.description!.length).toBeLessThanOrEqual(160);
    }
  });

  it("builds listing titles from property data", () => {
    const meta = buildPropertyMeta(SITE, land);
    expect(meta.title).toContain("Land for Sale in Danchhi, Kathmandu");
    expect(meta.title).toContain("NPR 50 Lakh");
    expect(meta.description).toContain("Land at danchhi chowk");
    expect(meta.description).toContain("priced at NPR 50 Lakh (NPR 4.17 Lakh per aana).");
    expect(meta.canonical).toBe(`${SITE}/properties/beautiful-land-in-danchhi-1023`);
  });

  it("self-canonicalises plain pagination and noindexes filtered views", () => {
    const page2 = buildListingIndexMeta(SITE, new URLSearchParams("page=2"));
    expect(page2.canonical).toBe(`${SITE}/properties?page=2`);
    expect(page2.robots).toBeUndefined();

    const filtered = buildListingIndexMeta(SITE, new URLSearchParams("district=Kathmandu&page=2"));
    expect(filtered.canonical).toBe(`${SITE}/properties`);
    expect(filtered.robots).toBe("noindex, follow");
  });
});

describe("structured data", () => {
  it("nests the place and area inside the offer", () => {
    const [listing, breadcrumb] = buildPropertyMeta(SITE, land).jsonLd!;
    const offers = listing.offers as {
      priceCurrency: string;
      itemOffered: { "@type": string; address: { addressLocality: string }; additionalProperty: { value: number } };
    };

    expect(listing["@type"]).toBe("RealEstateListing");
    expect(listing.datePosted).toBe("2026-10-01");
    expect(offers.priceCurrency).toBe("NPR");
    expect(offers.itemOffered["@type"]).toBe("Place");
    expect(offers.itemOffered.address.addressLocality).toBe("Kageshwori-Manohara Municipality");
    expect(offers.itemOffered.additionalProperty.value).toBe(12);
    expect(listing).not.toHaveProperty("address");
    expect(listing).not.toHaveProperty("floorSize");

    expect(breadcrumb["@type"]).toBe("BreadcrumbList");
    expect((breadcrumb.itemListElement as unknown[]).length).toBe(3);
  });

  it("marks sold listings as sold out", () => {
    const [listing] = buildPropertyMeta(SITE, { ...land, status: "sold" }).jsonLd!;
    expect((listing.offers as Record<string, string>).availability).toBe("https://schema.org/SoldOut");
  });
});

describe("head injection", () => {
  const shell = `<html><head><!--seo--><title>Default</title><!--/seo--></head><body></body></html>`;

  it("replaces the default block with page tags", () => {
    const html = injectHeadTags(shell, buildPropertyMeta(SITE, land), SITE);
    expect(html).not.toContain("<title>Default</title>");
    expect(html).toContain('<link rel="canonical" href="https://morgandevelopers.com/properties/beautiful-land-in-danchhi-1023" />');
    expect(html).toContain('<meta property="og:image" content="https://x.supabase.co/');
    expect(html.match(/application\/ld\+json/g)).toHaveLength(2);
  });

  it("escapes markup in listing data", () => {
    const html = injectHeadTags(shell, buildPropertyMeta(SITE, { ...land, title: 'Plot "A" </script><b>' }), SITE);
    expect(html).not.toContain("</script><b>");
    expect(html).toContain("&quot;A&quot;");
  });

  it("leaves pages without markers untouched", () => {
    expect(injectHeadTags("<html></html>", buildHomeMeta(SITE), SITE)).toBe("<html></html>");
  });
});

describe("thumbnails", () => {
  it("points Supabase images at the uploaded thumbnail", () => {
    expect(getThumbnailUrl("https://x.supabase.co/storage/v1/object/public/property-images/u/1.webp")).toBe(
      "https://x.supabase.co/storage/v1/object/public/property-images/u/1-thumb.webp"
    );
  });

  it("leaves other hosts alone", () => {
    expect(getThumbnailUrl("https://example.com/a.jpg")).toBe("https://example.com/a.jpg");
  });
});

describe("land unit converter", () => {
  it("has search-friendly metadata", () => {
    const meta = buildLandConverterMeta(SITE);
    expect(meta.title.length).toBeLessThanOrEqual(60);
    expect(meta.description!.length).toBeLessThanOrEqual(160);
    expect(meta.canonical).toBe(`${SITE}/land-unit-converter`);
  });

  it("breaks areas into hill and Terai units", () => {
    expect(sqftToNepali(5476 + 342.25 * 3)).toEqual({ ropani: 1, anna: 3, paisa: 0, dam: 0 });
    expect(sqftToTerai(72900 + 3645 * 2 + 182.25 * 5)).toEqual({ bigha: 1, kattha: 2, dhur: 5 });
    expect(AREA_UNITS.bigha.toSqft / AREA_UNITS.ropani.toSqft).toBeCloseTo(13.31, 2);
  });

  it("carries a rounded-up last unit into the next one", () => {
    // 1360 sq ft is 3 aana, 3 paisa and 3.58 daam, which rounds to a whole aana more.
    expect(sqftToNepali(1360)).toEqual({ ropani: 0, anna: 4, paisa: 0, dam: 0 });
    expect(sqftToNepali(5475)).toEqual({ ropani: 1, anna: 0, paisa: 0, dam: 0 });
    expect(sqftToTerai(3645 - 0.5)).toEqual({ bigha: 0, kattha: 1, dhur: 0 });
    for (let sqft = 1; sqft <= 20000; sqft += 7) {
      expect(sqftToNepali(sqft).dam).toBeLessThan(4);
      expect(sqftToTerai(sqft).dhur).toBeLessThan(20);
    }
  });
});
