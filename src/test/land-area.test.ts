import { describe, expect, it } from "vitest";
import { buildLandAreaCalculatorMeta, rectangleAreaSqft, unevenAreaSqft } from "@/lib/land-area";
import { renderLandAreaCalculatorContent, renderLandConverterContent } from "../../netlify/lib/page-content.ts";

const SITE = "https://morgandevelopers.com";

describe("land area calculator", () => {
  it("works out plot area in square feet", () => {
    expect(rectangleAreaSqft(30, 40, "feet")).toBe(1200);
    expect(rectangleAreaSqft(10, 10, "metres")).toBeCloseTo(1076.39, 2);
    expect(unevenAreaSqft(30, 32, 40, 38, "feet")).toBe(31 * 39);
    expect(unevenAreaSqft(30, 30, 40, 40, "feet")).toBe(rectangleAreaSqft(30, 40, "feet"));
  });

  it("keeps the title and description within search result limits", () => {
    const meta = buildLandAreaCalculatorMeta(SITE);
    expect(meta.title).toBe("Land Area Calculator – Feet to Aana, Ropani & Kattha");
    expect(meta.description!.length).toBeLessThanOrEqual(158);
    expect(meta.canonical).toBe(`${SITE}/land-area-calculator`);
  });

  it("renders common plot sizes and the method for crawlers", () => {
    const html = renderLandAreaCalculatorContent();
    expect(html).toContain("<h1>Land Area Calculator</h1>");
    expect(html).toContain("<tr><td>30 × 40 ft</td><td>1,200</td><td>3.51</td><td>0-3-2-0</td><td>6.58</td></tr>");
    expect(html).toContain("1,200 ÷ 342.25 = 3.51 aana (0-3-2-0 in ropani-aana-paisa-daam)");
    expect(html).toContain('<a href="/land-unit-converter/ropani-to-square-feet">');
    expect(renderLandConverterContent()).toContain('<a href="/land-area-calculator">');
  });
});
