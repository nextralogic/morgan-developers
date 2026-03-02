const MAX_SIZE = 200 * 1024; // 200KB

export interface CompressionResult {
  compressedBlob: Blob;
  compressedFile: File;
  finalSize: number;
  originalSize: number;
  success: boolean;
  error?: string;
}

type CompressionProfile = {
  mimeType: "image/webp" | "image/jpeg";
  extension: "webp" | "jpg";
  qualityMax: number;
  qualityMin: number;
};

/**
 * Check if WebP is supported by the browser canvas.
 */
function supportsWebP(): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });
}

function drawScaledImage(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  bitmap: ImageBitmap,
  scale: number
) {
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
}

function toResult(
  file: File,
  blob: Blob,
  profile: CompressionProfile,
  originalSize: number
): CompressionResult {
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const compressedFile = new File([blob], `${baseName}.${profile.extension}`, {
    type: profile.mimeType,
  });

  return {
    compressedBlob: blob,
    compressedFile,
    finalSize: blob.size,
    originalSize,
    success: true,
  };
}

/**
 * Try to fit image under target for a specific output format with an adaptive
 * dimension + quality strategy. This is optimized for speed:
 * - 2 encodes per scale in most iterations
 * - binary search only when target is reachable at current scale
 */
async function compressWithProfile(
  file: File,
  bitmap: ImageBitmap,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  profile: CompressionProfile,
  targetSize: number,
  originalSize: number
): Promise<CompressionResult | null> {
  let scale = 1;
  const maxScalePasses = 6;

  for (let pass = 0; pass < maxScalePasses; pass++) {
    drawScaledImage(ctx, canvas, bitmap, scale);

    // 1) Try high quality first
    const highBlob = await canvasToBlob(canvas, profile.mimeType, profile.qualityMax);
    if (!highBlob) return null;
    if (highBlob.size <= targetSize) {
      return toResult(file, highBlob, profile, originalSize);
    }

    // 2) Try lower quality at same dimensions
    const lowBlob = await canvasToBlob(canvas, profile.mimeType, profile.qualityMin);
    if (!lowBlob) return null;

    if (lowBlob.size <= targetSize) {
      // 3) Reachable at this size: binary-search max acceptable quality (fast, few steps)
      let low = profile.qualityMin;
      let high = profile.qualityMax;
      let bestBlob = lowBlob;

      for (let i = 0; i < 4; i++) {
        const mid = Number(((low + high) / 2).toFixed(3));
        const midBlob = await canvasToBlob(canvas, profile.mimeType, mid);
        if (!midBlob) break;

        if (midBlob.size <= targetSize) {
          bestBlob = midBlob;
          low = Math.min(profile.qualityMax, mid + 0.02);
        } else {
          high = Math.max(profile.qualityMin, mid - 0.02);
        }
      }

      return toResult(file, bestBlob, profile, originalSize);
    }

    // 4) Not reachable even at low quality: downscale adaptively using size ratio.
    //    size approximately scales with area => nextScale ~ sqrt(target/current)
    const ratio = targetSize / lowBlob.size;
    let scaleFactor = Math.sqrt(ratio) * 0.96;
    scaleFactor = Math.max(0.58, Math.min(0.9, scaleFactor));
    let nextScale = scale * scaleFactor;

    // Ensure progress
    if (nextScale > scale - 0.01) {
      nextScale = scale * 0.85;
    }

    const nextWidth = Math.round(bitmap.width * nextScale);
    const nextHeight = Math.round(bitmap.height * nextScale);
    if (nextWidth < 420 || nextHeight < 420) {
      // Prevent overly tiny output while keeping attempt deterministic
      const widthBound = 420 / bitmap.width;
      const heightBound = 420 / bitmap.height;
      nextScale = Math.max(Math.min(widthBound, heightBound), 0.35);
      drawScaledImage(ctx, canvas, bitmap, nextScale);

      const finalBlob = await canvasToBlob(
        canvas,
        profile.mimeType,
        Math.max(0.5, profile.qualityMin - 0.08)
      );
      if (finalBlob && finalBlob.size <= targetSize) {
        return toResult(file, finalBlob, profile, originalSize);
      }
      return null;
    }

    scale = nextScale;
  }

  return null;
}

/**
 * Compress an image file to a target size (default 200KB).
 * Prioritizes speed and visual quality:
 * - keep dimensions high when possible
 * - only reduce dimensions as needed
 * - choose highest quality that stays within target
 */
export async function compressImageToTargetSize(
  file: File,
  targetSize: number = MAX_SIZE
): Promise<CompressionResult> {
  const originalSize = file.size;

  if (originalSize <= targetSize) {
    return {
      compressedBlob: file,
      compressedFile: file,
      finalSize: originalSize,
      originalSize,
      success: true,
    };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return {
      compressedBlob: file,
      compressedFile: file,
      finalSize: originalSize,
      originalSize,
      success: false,
      error: "Could not read image file.",
    };
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return {
      compressedBlob: file,
      compressedFile: file,
      finalSize: originalSize,
      originalSize,
      success: false,
      error: "Could not initialize image compressor.",
    };
  }

  const profiles: CompressionProfile[] = [];
  if (supportsWebP()) {
    profiles.push({
      mimeType: "image/webp",
      extension: "webp",
      qualityMax: 0.9,
      qualityMin: 0.62,
    });
  }
  profiles.push({
    mimeType: "image/jpeg",
    extension: "jpg",
    qualityMax: 0.88,
    qualityMin: 0.58,
  });

  try {
    for (const profile of profiles) {
      const result = await compressWithProfile(
        file,
        bitmap,
        canvas,
        ctx,
        profile,
        targetSize,
        originalSize
      );
      if (result) return result;
    }
  } finally {
    bitmap.close();
  }

  return {
    compressedBlob: file,
    compressedFile: file,
    finalSize: originalSize,
    originalSize,
    success: false,
    error: "Could not compress below 200KB. Please choose a different image.",
  };
}

/** Format bytes to human-readable KB */
export function formatFileSize(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/** Check if a file is within the upload size limit */
export function isWithinSizeLimit(file: File, limit = MAX_SIZE): boolean {
  return file.size <= limit;
}
