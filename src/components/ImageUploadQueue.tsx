import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Loader2, CheckCircle2, AlertTriangle, ImageDown } from "lucide-react";
import {
  compressImageToTargetSize,
  formatFileSize,
  isWithinSizeLimit,
} from "@/lib/image-compress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAX_SIZE = 200 * 1024;

type FileStatus = "ready" | "too_large" | "compressing" | "compressed" | "uploading" | "uploaded" | "failed";

interface QueuedFile {
  id: string;
  originalFile: File;
  uploadFile: File; // may be the compressed version
  previewUrl: string;
  originalSize: number;
  currentSize: number;
  status: FileStatus;
  error?: string;
  uploadedUrl?: string;
}

interface UploadedImage {
  image_url: string;
  is_primary: boolean;
  id?: string;
}

interface ImageUploadQueueProps {
  userId: string;
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
}

const STATUS_CONFIG: Record<FileStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ready: { label: "Ready", variant: "secondary" },
  too_large: { label: "Too large", variant: "destructive" },
  compressing: { label: "Compressing…", variant: "outline" },
  compressed: { label: "Compressed", variant: "secondary" },
  uploading: { label: "Uploading…", variant: "outline" },
  uploaded: { label: "Uploaded", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
};

const ImageUploadQueue = ({ userId, images, onImagesChange }: ImageUploadQueueProps) => {
  const [queue, setQueue] = useState<QueuedFile[]>([]);

  const updateQueueItem = useCallback((id: string, updates: Partial<QueuedFile>) => {
    setQueue((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newItems: QueuedFile[] = Array.from(files).map((file) => {
      const withinLimit = isWithinSizeLimit(file, MAX_SIZE);
      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        originalFile: file,
        uploadFile: file,
        previewUrl: URL.createObjectURL(file),
        originalSize: file.size,
        currentSize: file.size,
        status: withinLimit ? "ready" : "too_large",
      };
    });

    setQueue((prev) => [...prev, ...newItems]);
    e.target.value = "";

    // Auto-upload ready files
    newItems.filter((f) => f.status === "ready").forEach((f) => uploadFile(f));
  };

  const uploadFile = async (item: QueuedFile) => {
    updateQueueItem(item.id, { status: "uploading" });
    const file = item.uploadFile;
    const ext = file.name.split(".").pop();
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from("property-images").upload(path, file);
    if (error) {
      updateQueueItem(item.id, { status: "failed", error: error.message });
      toast.error(`Failed to upload ${item.originalFile.name}`);
      return;
    }

    const { data: urlData } = supabase.storage.from("property-images").getPublicUrl(path);
    updateQueueItem(item.id, { status: "uploaded", uploadedUrl: urlData.publicUrl });

    onImagesChange([
      ...images,
      { image_url: urlData.publicUrl, is_primary: images.length === 0 },
    ]);
  };

  const handleCompress = async (id: string) => {
    const item = queue.find((f) => f.id === id);
    if (!item) return;

    updateQueueItem(id, { status: "compressing" });

    const result = await compressImageToTargetSize(item.originalFile, MAX_SIZE);

    if (!result.success) {
      updateQueueItem(id, { status: "failed", error: result.error });
      toast.error(result.error || "Compression failed.");
      return;
    }

    // Update preview with compressed version
    const newPreviewUrl = URL.createObjectURL(result.compressedBlob);
    URL.revokeObjectURL(item.previewUrl);

    const updatedItem: Partial<QueuedFile> = {
      uploadFile: result.compressedFile,
      previewUrl: newPreviewUrl,
      currentSize: result.finalSize,
      status: "compressed",
    };

    updateQueueItem(id, updatedItem);

    // Auto-upload after compression
    await uploadFile({ ...item, ...updatedItem } as QueuedFile);
  };

  // Existing uploaded images (from DB on edit)
  const removeExistingImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    if (updated.length > 0 && !updated.some((img) => img.is_primary)) updated[0].is_primary = true;
    onImagesChange(updated);
  };

  const setPrimary = (index: number) => {
    onImagesChange(images.map((img, i) => ({ ...img, is_primary: i === index })));
  };

  // Active queue items (not yet uploaded)
  const pendingQueue = queue.filter((f) => f.status !== "uploaded");

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {/* Existing uploaded images */}
        {images.map((img, i) => (
          <div key={i} className="group relative h-24 w-24 overflow-hidden rounded-lg border">
            <img src={img.image_url} alt="" className="h-full w-full object-cover" />
            {img.is_primary && (
              <span className="absolute bottom-0 left-0 right-0 bg-primary/80 px-1 text-center text-[10px] font-medium text-primary-foreground">
                Primary
              </span>
            )}
            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-foreground/40 opacity-0 transition-opacity group-hover:opacity-100">
              {!img.is_primary && (
                <Button type="button" size="icon" variant="secondary" className="h-6 w-6" onClick={() => setPrimary(i)}>★</Button>
              )}
              <Button type="button" size="icon" variant="destructive" className="h-6 w-6" onClick={() => removeExistingImage(i)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}

        {/* Upload button */}
        <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary">
          <Upload className="h-5 w-5" />
          <span className="mt-1 text-[10px]">Upload</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
        </label>
      </div>

      {/* Pending queue */}
      {pendingQueue.length > 0 && (
        <div className="mt-4 space-y-2">
          {pendingQueue.map((item) => {
            const cfg = STATUS_CONFIG[item.status];
            return (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                <img src={item.previewUrl} alt="" className="h-12 w-12 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.originalFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(item.originalSize)}
                    {item.currentSize !== item.originalSize && (
                      <span className="text-primary"> → {formatFileSize(item.currentSize)}</span>
                    )}
                  </p>
                  {item.error && <p className="text-xs text-destructive">{item.error}</p>}
                </div>
                <Badge variant={cfg.variant} className="shrink-0 text-[10px]">
                  {item.status === "compressing" || item.status === "uploading" ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : item.status === "uploaded" || item.status === "compressed" ? (
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                  ) : item.status === "too_large" || item.status === "failed" ? (
                    <AlertTriangle className="mr-1 h-3 w-3" />
                  ) : null}
                  {cfg.label}
                </Badge>
                {item.status === "too_large" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1 text-xs"
                    onClick={() => handleCompress(item.id)}
                  >
                    <ImageDown className="h-3.5 w-3.5" />
                    Compress & Upload
                  </Button>
                )}
                {(item.status === "too_large" || item.status === "failed") && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={() => removeFromQueue(item.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        To keep the platform fast and storage costs low, images must be 200KB or less.
      </p>
    </div>
  );
};

export default ImageUploadQueue;
