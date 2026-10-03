/**
 * The build lists the JS files each lazy page in src/pages needs in a comment
 * in index.html (see vite.config.ts). The seo edge function swaps the comment
 * for <link rel="modulepreload"> tags for the page being served, so the page's
 * code downloads alongside the main bundle instead of after it has run.
 */

const PAGE_CHUNKS = /<!--page-chunks:(.*?)-->\n?/;

export function pageChunksComment(pages: Record<string, string[]>): string {
  return `<!--page-chunks:${JSON.stringify(pages)}-->`;
}

function chunksFor(json: string, page: string | null): string[] {
  if (!page) return [];
  try {
    const files = JSON.parse(json)[page];
    return Array.isArray(files) ? files : [];
  } catch {
    return [];
  }
}

/** Replaces the page-chunks comment with modulepreload links for `page`, or removes it. */
export function injectModulePreloads(html: string, page: string | null): string {
  const match = html.match(PAGE_CHUNKS);
  if (!match) return html;
  const links = chunksFor(match[1], page).map((href) => `<link rel="modulepreload" crossorigin href="${href}">`);
  return html.replace(PAGE_CHUNKS, () => (links.length ? `${links.join("\n    ")}\n` : ""));
}
