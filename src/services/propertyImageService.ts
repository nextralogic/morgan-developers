import { supabase } from "@/integrations/supabase/client";
import { storagePathsForImage } from "@/lib/image-url";

export interface ListingImage {
  image_url: string;
  is_primary: boolean;
}

/**
 * Removes the stored files (photo and thumbnail) of photos no listing uses any
 * more. Best effort: a file left behind only costs storage space.
 */
export async function removeImageFiles(imageUrls: string[]): Promise<void> {
  const paths = imageUrls.flatMap(storagePathsForImage);
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from("property-images").remove(paths);
  if (error) console.warn("Could not remove photo files (non-critical)", error);
}

/**
 * Saves a listing's photos in order. When editing, pass the photos the listing
 * had before: their old rows are replaced, and the files of photos the edit
 * dropped are removed. The new rows are saved before the old ones are deleted,
 * so a failed save never leaves the listing without photos.
 */
export async function saveListingImages(
  propertyId: string,
  images: ListingImage[],
  previous: ListingImage[] | null
): Promise<{ error: unknown }> {
  const rows = images.map((img, i) => ({
    property_id: propertyId,
    image_url: img.image_url,
    is_primary: img.is_primary,
    display_order: i,
  }));
  const { data: saved, error } = rows.length > 0
    ? await supabase.from("property_images").insert(rows).select("id")
    : { data: [], error: null };
  if (error || previous === null) return { error };

  const keepIds = (saved ?? []).map((img: { id: string }) => img.id);
  let staleRows = supabase.from("property_images").delete().eq("property_id", propertyId);
  if (keepIds.length > 0) staleRows = staleRows.not("id", "in", `(${keepIds.join(",")})`);
  const { error: staleError } = await staleRows;
  // Old rows that could not be deleted still point at their files, so keep the files.
  if (staleError) return { error: null };

  const kept = new Set(images.map((img) => img.image_url));
  await removeImageFiles(previous.map((img) => img.image_url).filter((url) => !kept.has(url)));
  return { error: null };
}
