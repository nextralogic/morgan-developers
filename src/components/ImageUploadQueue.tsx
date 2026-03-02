import { useState, useCallback, useEffect, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Loader2, CheckCircle2, AlertTriangle, ImageDown, Eye, Star } from "lucide-react";
import {
  compressImageToTargetSize,
  formatFileSize,
  isWithinSizeLimit,
} from "@/lib/image-compress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  onImagesChange: Dispatch<SetStateAction<UploadedImage[]>>;
}

const getClipboardImageFiles = (clipboardData: DataTransfer | null): File[] => {
  if (!clipboardData) return [];

  return Array.from(clipboardData.items)
    .filter((item) => item.type.startsWith("image/"))
    .map((item, index) => {
      const blob = item.getAsFile();
      if (!blob) return null;

      if (blob.name) return blob;

      const extension = item.type.split("/")[1] || "png";
      return new File([blob], `pasted-image-${Date.now()}-${index}.${extension}`, {
        type: item.type || blob.type,
      });
    })
    .filter((file): file is File => file !== null);
};

const ImageUploadQueue = ({ userId, images, onImagesChange }: ImageUploadQueueProps) => {
  const { t } = useTranslation("owner");
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [previewImage, setPreviewImage] = useState<{ url: string; name?: string } | null>(null);
  const statusConfig: Record<FileStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    ready: { label: t("imageUpload.statuses.ready"), variant: "secondary" },
    too_large: { label: t("imageUpload.statuses.too_large"), variant: "destructive" },
    compressing: { label: t("imageUpload.statuses.compressing"), variant: "outline" },
    compressed: { label: t("imageUpload.statuses.compressed"), variant: "secondary" },
    uploading: { label: t("imageUpload.statuses.uploading"), variant: "outline" },
    uploaded: { label: t("imageUpload.statuses.uploaded"), variant: "default" },
    failed: { label: t("imageUpload.statuses.failed"), variant: "destructive" },
  };

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

  const uploadFile = useCallback(
    async (item: QueuedFile) => {
      updateQueueItem(item.id, { status: "uploading" });
      const file = item.uploadFile;
      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage.from("property-images").upload(path, file);
      if (error) {
        const uploadError = t("imageUpload.toasts.uploadFailed", { name: item.originalFile.name });
        updateQueueItem(item.id, { status: "failed", error: uploadError });
        toast.error(uploadError);
        return;
      }

      const { data: urlData } = supabase.storage.from("property-images").getPublicUrl(path);
      updateQueueItem(item.id, { status: "uploaded", uploadedUrl: urlData.publicUrl });

      onImagesChange((prev) => [
        ...prev,
        { image_url: urlData.publicUrl, is_primary: prev.length === 0 },
      ]);
    },
    [onImagesChange, t, updateQueueItem, userId]
  );

  const enqueueFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;

      const newItems: QueuedFile[] = files.map((file) => {
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

      // Auto-upload ready files
      newItems
        .filter((f) => f.status === "ready")
        .forEach((f) => {
          void uploadFile(f);
        });
    },
    [uploadFile]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    enqueueFiles(Array.from(files));
    e.target.value = "";
  };

  const handleClipboardPaste = useCallback(
    (clipboardData: DataTransfer | null) => {
      const imageFiles = getClipboardImageFiles(clipboardData);
      if (imageFiles.length === 0) return false;

      enqueueFiles(imageFiles);
      toast.success(t("imageUpload.toasts.pasteAdded", { count: imageFiles.length }));
      return true;
    },
    [enqueueFiles, t]
  );

  const handlePaste = (event: React.ClipboardEvent<HTMLElement>) => {
    const pasted = handleClipboardPaste(event.clipboardData);
    if (pasted) {
      event.preventDefault();
    }
  };

  useEffect(() => {
    const onDocumentPaste = (event: ClipboardEvent) => {
      if (event.defaultPrevented) return;
      const pasted = handleClipboardPaste(event.clipboardData);
      if (pasted) {
        event.preventDefault();
      }
    };

    document.addEventListener("paste", onDocumentPaste);
    return () => {
      document.removeEventListener("paste", onDocumentPaste);
    };
  }, [handleClipboardPaste]);

  const handleCompress = async (id: string) => {
    const item = queue.find((f) => f.id === id);
    if (!item) return;

    updateQueueItem(id, { status: "compressing" });

    const result = await compressImageToTargetSize(item.originalFile, MAX_SIZE);

    if (!result.success) {
      const compressionError = result.error || t("imageUpload.toasts.compressionFailed");
      updateQueueItem(id, { status: "failed", error: compressionError });
      toast.error(compressionError);
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
    onImagesChange((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some((img) => img.is_primary)) {
        updated[0] = { ...updated[0], is_primary: true };
      }
      return updated;
    });
  };

  const setPrimary = (index: number) => {
    onImagesChange((prev) => prev.map((img, i) => ({ ...img, is_primary: i === index })));
  };

  // Active queue items (not yet uploaded)
  const pendingQueue = queue.filter((f) => f.status !== "uploaded");

  return (
    <div onPaste={handlePaste}>
      <div className="flex flex-wrap gap-3">
        {/* Existing uploaded images */}
        {images.map((img, i) => (
          <div key={i} className="group relative h-24 w-24 overflow-hidden rounded-lg border">
            <button
              type="button"
              onClick={() => setPreviewImage({ url: img.image_url })}
              className="h-full w-full"
              aria-label={t("imageUpload.actions.preview")}
            >
              <img src={img.image_url} alt={t("imageUpload.previewAlt")} className="h-full w-full object-cover" />
            </button>
            {img.is_primary && (
              <span className="absolute bottom-0 left-0 right-0 bg-primary/80 px-1 text-center text-[10px] font-medium text-primary-foreground">
                {t("imageUpload.primary")}
              </span>
            )}
            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-foreground/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-6 w-6"
                onClick={() => setPreviewImage({ url: img.image_url })}
                aria-label={t("imageUpload.actions.preview")}
              >
                <Eye className="h-3 w-3" />
              </Button>
              {!img.is_primary && (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-6 w-6"
                  onClick={() => setPrimary(i)}
                  aria-label={t("imageUpload.actions.setPrimary")}
                >
                  <Star className="h-3 w-3" />
                </Button>
              )}
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="h-6 w-6"
                onClick={() => removeExistingImage(i)}
                aria-label={t("imageUpload.actions.remove")}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}

        {/* Upload button */}
        <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary">
          <Upload className="h-5 w-5" />
          <span className="mt-1 text-[10px]">{t("imageUpload.upload")}</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
        </label>
      </div>

      {/* Pending queue */}
      {pendingQueue.length > 0 && (
        <div className="mt-4 space-y-2">
          {pendingQueue.map((item) => {
            const cfg = statusConfig[item.status];
            return (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                <button
                  type="button"
                  onClick={() => setPreviewImage({ url: item.previewUrl, name: item.originalFile.name })}
                  aria-label={t("imageUpload.actions.preview")}
                  className="shrink-0"
                >
                  <img src={item.previewUrl} alt={t("imageUpload.previewAlt")} className="h-12 w-12 rounded object-cover" />
                </button>
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
                    {t("imageUpload.compressAndUpload")}
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
        {t("imageUpload.sizeHint")}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("imageUpload.pasteHint")}
      </p>

      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-3xl overflow-hidden p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle>{t("imageUpload.previewTitle")}</DialogTitle>
            {previewImage?.name && (
              <DialogDescription className="truncate">{previewImage.name}</DialogDescription>
            )}
          </DialogHeader>
          <div className="bg-black/90">
            {previewImage && (
              <img
                src={previewImage.url}
                alt={t("imageUpload.previewAlt")}
                className="max-h-[75vh] w-full object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImageUploadQueue;
