import { describe, expect, it } from "vitest";
import { propertyDataKey, takeInitialData } from "@/lib/initial-data";
import { injectInitialData } from "../../netlify/lib/page-content.ts";

describe("initial data", () => {
  it("hands the embedded listing to the page once", () => {
    const row = { id: "a1", title: "Land </script> in Danchhi" };
    const html = injectInitialData('<html><body><div id="root"></div></body></html>', {
      [propertyDataKey("land-in-danchhi-1023")]: row,
    });
    document.body.innerHTML = html.slice(html.indexOf("<body>") + "<body>".length, html.indexOf("</body>"));

    expect(takeInitialData(propertyDataKey("other-listing-1001"))).toBeUndefined();
    expect(takeInitialData(propertyDataKey("land-in-danchhi-1023"))).toEqual(row);
    expect(takeInitialData(propertyDataKey("land-in-danchhi-1023"))).toBeUndefined();
  });
});
