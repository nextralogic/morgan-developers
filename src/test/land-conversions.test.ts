import { describe, expect, it } from "vitest";
import {
  buildLandConversionMeta,
  CONVERSION_PAIRS,
  conversionFactor,
  conversionPath,
  conversionSlug,
  findConversionPair,
  formatConverted,
} from "@/lib/land-conversions";
import { renderLandConversionContent } from "../../netlify/lib/page-content.ts";

const SITE = "https://morgandevelopers.com";

describe("land unit conversions", () => {
  it("uses the standard Nepali land measurements", () => {
    const factor = (slug: string) => conversionFactor(findConversionPair(slug)!);
    expect(factor("ropani-to-square-feet")).toBe(5476);
    expect(factor("aana-to-square-feet")).toBe(342.25);
    expect(factor("ropani-to-aana")).toBe(16);
    expect(factor("bigha-to-kattha")).toBe(20);
    expect(factor("kattha-to-square-feet")).toBe(3645);
    expect(formatConverted(factor("bigha-to-ropani"))).toBe("13.31");
    expect(formatConverted(factor("square-feet-to-aana"))).toBe("0.002922");
  });

  it("gives every pair a unique, resolvable URL", () => {
    const slugs = CONVERSION_PAIRS.map(conversionSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const pair of CONVERSION_PAIRS) {
      expect(findConversionPair(conversionSlug(pair))).toBe(pair);
      expect(conversionPath(pair)).toMatch(/^\/land-unit-converter\/[a-z-]+$/);
    }
    expect(findConversionPair("ropani-to-bananas")).toBeUndefined();
  });

  it("keeps titles and descriptions within search result limits", () => {
    for (const pair of CONVERSION_PAIRS) {
      const meta = buildLandConversionMeta(SITE, pair);
      expect(meta.title.length).toBeLessThanOrEqual(60);
      expect(meta.description!.length).toBeLessThanOrEqual(158);
      expect(meta.canonical).toBe(`${SITE}${conversionPath(pair)}`);
    }
    expect(buildLandConversionMeta(SITE, findConversionPair("ropani-to-square-feet")!).title).toBe(
      "Ropani to Sq Ft Converter – 1 Ropani = 5,476 Sq Ft"
    );
  });

  it("renders the answer, a worked example and the table for crawlers", () => {
    const html = renderLandConversionContent(findConversionPair("ropani-to-square-feet")!);
    expect(html).toContain("<h1>Ropani to Square Feet Converter</h1>");
    expect(html).toContain("<p>1 ropani = 5,476 square feet</p>");
    expect(html).toContain("<p>1 square foot = 0.0001826 ropani</p>");
    expect(html).toContain("multiply the number of ropani by 5,476");
    expect(html).toContain("<td>0.5 ropani</td><td>2,738 square feet</td>");
    expect(html).not.toContain('href="/land-unit-converter/ropani-to-square-feet"');
    expect(html).toContain('href="/land-unit-converter/aana-to-square-feet"');

    const reverse = renderLandConversionContent(findConversionPair("square-feet-to-aana")!);
    expect(reverse).toContain("divide the number of square feet by 342.25");
    expect(reverse).toContain("Aana is also written anna.");
  });
});
