import { describe, expect, it } from "vitest";
import { injectModulePreloads, pageChunksComment } from "../../netlify/lib/page-chunks.ts";

const html = (comment: string) => `<head>\n    <title>x</title>\n    ${comment}\n  </head>`;
const built = html(
  pageChunksComment({
    PropertyDetail: ["/assets/PropertyDetail-a.js", "/assets/Footer-b.js"],
    Index: ["/assets/Index-c.js"],
  })
);

describe("injectModulePreloads", () => {
  it("adds modulepreload links for the page and drops the comment", () => {
    const out = injectModulePreloads(built, "PropertyDetail");
    expect(out).toContain('<link rel="modulepreload" crossorigin href="/assets/PropertyDetail-a.js">');
    expect(out).toContain('<link rel="modulepreload" crossorigin href="/assets/Footer-b.js">');
    expect(out).not.toContain("Index-c.js");
    expect(out).not.toContain("page-chunks");
  });

  it("only removes the comment for unknown or private pages", () => {
    for (const page of [null, "AdminDashboard"]) {
      const out = injectModulePreloads(built, page);
      expect(out).not.toContain("page-chunks");
      expect(out).not.toContain("<link");
      expect(out).toContain("<title>x</title>");
    }
  });

  it("leaves pages without the comment alone", () => {
    const plain = html("");
    expect(injectModulePreloads(plain, "Index")).toBe(plain);
  });
});
