import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getThumbnailUrl } from "@/lib/image-url";
import { useTranslation } from "react-i18next";

interface ImageGalleryProps {
  images: { image_url: string; is_primary: boolean; display_order: number }[];
  title: string;
}

const ImageGallery = ({ images, title }: ImageGalleryProps) => {
  const { t } = useTranslation("propertyDetail");
  const sorted = [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return a.display_order - b.display_order;
  });

  const [current, setCurrent] = useState(0);

  if (sorted.length === 0) {
    return (
      <div className="aspect-video rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
        {t("gallery.noImages")}
      </div>
    );
  }

  const prev = () => setCurrent((c) => (c === 0 ? sorted.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === sorted.length - 1 ? 0 : c + 1));

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
        <img
          src={sorted[current].image_url}
          alt={t("gallery.imageAlt", { title, index: current + 1 })}
          className="h-full w-full object-cover"
          width={1280}
          height={720}
          fetchpriority={current === 0 ? "high" : "auto"}
        />
        {sorted.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={prev}
              aria-label={t("gallery.previous")}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-card/70 backdrop-blur-sm hover:bg-card/90"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={next}
              aria-label={t("gallery.next")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-card/70 backdrop-blur-sm hover:bg-card/90"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <span className="absolute bottom-3 right-3 rounded-full bg-card/70 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              {current + 1} / {sorted.length}
            </span>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sorted.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={t("gallery.showPhoto", { index: i + 1 })}
              aria-pressed={i === current}
              className={cn(
                "h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                i === current ? "border-primary ring-1 ring-primary/30" : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              <img
                src={getThumbnailUrl(img.image_url)}
                data-fallback-src={img.image_url}
                alt=""
                width={80}
                height={64}
                loading="lazy"
                className="h-full w-full object-cover"
                onError={(e) => {
                  const fallback = e.currentTarget.dataset.fallbackSrc;
                  if (!fallback) return;
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = fallback;
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
