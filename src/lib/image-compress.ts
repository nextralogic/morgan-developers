const MAX_SIZE = 200 * 1024; // 200KB

export interface CompressionResult {
  compressedBlob: Blob;
  compressedFile: File;
  finalSize: number;
  originalSize: number;
  success: boolean;
  error?: string;
}

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

/**
 * Compress an image file to a target size (default 200KB) using iterative
 * canvas-based compression. Prefers WebP, falls back to JPEG.
 *
 * Strategy:
 *  1. Start at maxDim=1600 and quality=0.82
 *  2. Reduce quality stepwise (0.82 → 0.72 → 0.62 → 0.52 → 0.45)
 *  3. If still too large, reduce dimensions (1600 → 1400 → 1200 → 1000 → 900)
 *  4. Stop once ≤ targetSize or thresholds exhausted
 */
export async function compressImageToTargetSize(
  file: File,
  targetSize: number = MAX_SIZE
): Promise<CompressionResult> {
  const originalSize = file.size;

  // Already small enough
  if (originalSize <= targetSize) {
    return {
      compressedBlob: file,
      compressedFile: file,
      finalSize: originalSize,
      originalSize,
      success: true,
    };
  }

  const useWebP = supportsWebP();
  const mimeType = useWebP ? "image/webp" : "image/jpeg";
  const extension = useWebP ? "webp" : "jpg";

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

  const dimensions = [1600, 1400, 1200, 1000, 900];
  const qualities = [0.82, 0.72, 0.62, 0.52, 0.45];

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  for (const maxDim of dimensions) {
    for (const quality of qualities) {
      // Scale to fit within maxDim
      let w = bitmap.width;
      let h = bitmap.height;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(bitmap, 0, 0, w, h);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, mimeType, quality)
      );

      if (blob && blob.size <= targetSize) {
        const baseName = file.name.replace(/\.[^.]+$/, "");
        const compressedFile = new File([blob], `${baseName}.${extension}`, {
          type: mimeType,
        });

        bitmap.close();
        return {
          compressedBlob: blob,
          compressedFile,
          finalSize: blob.size,
          originalSize,
          success: true,
        };
      }
    }
  }

  bitmap.close();
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
