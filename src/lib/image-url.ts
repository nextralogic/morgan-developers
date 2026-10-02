export const THUMBNAIL_WIDTH = 480;
const THUMBNAIL_SUFFIX = "-thumb.webp";

/** Storage path of the thumbnail stored next to an uploaded image. */
export function getThumbnailPath(path: string): string {
  return path.replace(/\.[a-z0-9]+$/i, "") + THUMBNAIL_SUFFIX;
}

/**
 * Small version of a listing photo for cards and gallery thumbnails.
 * Supabase uploads get a "-thumb.webp" sibling at upload time (on-the-fly image
 * transforms are not available on the free plan). Older images without one
 * fall back to the original through the <img> onError handler.
 */
export function getThumbnailUrl(url: string, width = THUMBNAIL_WIDTH): string {
  if (!url) return url;
  if (url.includes("/storage/v1/object/public/") && !url.endsWith(THUMBNAIL_SUFFIX)) {
    const [base, query] = url.split("?");
    return getThumbnailPath(base) + (query ? `?${query}` : "");
  }
  if (url.includes("images.unsplash.com")) {
    const u = new URL(url);
    u.searchParams.set("w", String(width));
    u.searchParams.set("q", "75");
    u.searchParams.set("fm", "webp");
    return u.toString();
  }
  return url;
}
