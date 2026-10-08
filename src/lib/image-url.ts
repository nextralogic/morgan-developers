export const THUMBNAIL_WIDTH = 480;
const THUMBNAIL_SUFFIX = "-thumb.webp";
const LISTING_PHOTOS_PATH = "/storage/v1/object/public/property-images/";

/**
 * Storage path for a new listing photo in the owner's folder. The database only
 * accepts photo names made of letters, digits, dots, dashes and underscores, so
 * the extension taken from the file name is cleaned up.
 */
export function newListingPhotoPath(userId: string, fileName: string): string {
  const ext = fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  return `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext || "jpg"}`;
}

/** Storage path of the thumbnail stored next to an uploaded image. */
export function getThumbnailPath(path: string): string {
  return path.replace(/\.[a-z0-9]+$/i, "") + THUMBNAIL_SUFFIX;
}

/** Storage paths of an uploaded listing photo and its thumbnail; none for photos hosted elsewhere. */
export function storagePathsForImage(url: string): string[] {
  const start = url.indexOf(LISTING_PHOTOS_PATH);
  if (start === -1) return [];
  const path = decodeURIComponent(url.slice(start + LISTING_PHOTOS_PATH.length).split("?")[0]);
  return path ? [path, getThumbnailPath(path)] : [];
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
