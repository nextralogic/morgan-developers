import { SITE_URL } from "@/lib/seo/constants";
import { buildPropertyPath } from "@/lib/seo/core";

/**
 * IndexNow lets Bing and other participating search engines recrawl a page as
 * soon as it changes instead of waiting for the next sitemap visit. The key is
 * public by design: engines verify it against /<key>.txt on this site.
 */
const INDEXNOW_KEY = "a65d3ae65bc1c099b225c0899f8d76dc";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

export interface ListingUrlParts {
  title: string;
  property_public_id: number;
}

/**
 * Report that a listing page was published, edited, unpublished or removed.
 * Best-effort: the browser cannot read the response, and errors are ignored.
 */
export function notifyListingChanged(...listings: ListingUrlParts[]): void {
  if (!import.meta.env.PROD) return;
  const urls = new Set(listings.map((l) => `${SITE_URL}${buildPropertyPath(l.title, l.property_public_id)}`));
  for (const url of urls) {
    fetch(`${INDEXNOW_ENDPOINT}?url=${encodeURIComponent(url)}&key=${INDEXNOW_KEY}`, {
      mode: "no-cors",
      keepalive: true,
    }).catch(() => undefined);
  }
}
