import { describe, expect, it } from "vitest";
import { storagePathsForImage } from "@/lib/image-url";

const BASE = "https://gksaovhgxlxvogxsejkj.supabase.co/storage/v1/object/public/property-images";

describe("storagePathsForImage", () => {
  it("returns the photo and its thumbnail for an uploaded listing photo", () => {
    expect(storagePathsForImage(`${BASE}/user-1/1759900000000-abc123.jpg`)).toEqual([
      "user-1/1759900000000-abc123.jpg",
      "user-1/1759900000000-abc123-thumb.webp",
    ]);
  });

  it("ignores a query string and decodes escaped characters", () => {
    expect(storagePathsForImage(`${BASE}/user-1/my%20photo.png?width=480`)).toEqual([
      "user-1/my photo.png",
      "user-1/my photo-thumb.webp",
    ]);
  });

  it("returns nothing for photos hosted elsewhere or in another bucket", () => {
    expect(storagePathsForImage("https://images.unsplash.com/photo-123?w=800")).toEqual([]);
    expect(storagePathsForImage("https://x.supabase.co/storage/v1/object/public/avatars/user-1/a.jpg")).toEqual([]);
    expect(storagePathsForImage(`${BASE}/`)).toEqual([]);
  });
});
