import { describe, expect, it } from "vitest";
import { ilikeAny } from "@/lib/postgrest";
import { filtersFromParams, filtersToParams } from "@/services/propertySearchService";

describe("ilikeAny", () => {
  it("quotes the term so commas and brackets stay inside the value", () => {
    expect(ilikeAny(["title", "name"], "Kathmandu, Ward (5)")).toBe(
      'title.ilike."%Kathmandu, Ward (5)%",name.ilike."%Kathmandu, Ward (5)%"'
    );
  });

  it("escapes quotes and backslashes", () => {
    expect(ilikeAny(["title"], 'a"b\\c')).toBe('title.ilike."%a\\"b\\\\c%"');
  });
});

describe("listing URL params", () => {
  it("ignores numbers that do not parse", () => {
    const filters = filtersFromParams(new URLSearchParams("page=abc&minPrice=x&maxPrice=5000000"));
    expect(filters.page).toBe(1);
    expect(filters.minPrice).toBeUndefined();
    expect(filters.maxPrice).toBe(5_000_000);
  });

  it("round-trips filters through the URL", () => {
    const params = new URLSearchParams("q=Baneshwor&type=land&district=Kathmandu&minPrice=0&sort=price_low&page=2");
    expect(filtersToParams(filtersFromParams(params)).toString()).toBe(
      "q=Baneshwor&type=land&district=Kathmandu&sort=price_low&page=2"
    );
  });
});
