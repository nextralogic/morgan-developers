import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Maximize } from "lucide-react";
import { formatAreaWithUnit } from "@/lib/area-utils";
import { buildPropertyUrl } from "@/lib/property-url";

interface PropertyCardProps {
  id: string;
  title: string;
  price: number;
  type: string;
  imageUrl?: string;
  locationName?: string;
  areaSqft?: number;
  areaValue?: number;
  areaUnit?: string;
  propertyPublicId?: number;
}

const getOptimizedImageUrl = (url: string, width: number) => {
  if (!url) return url;
  // Supabase storage: use render/image transform endpoint
  if (url.includes('supabase.co/storage/v1/object/public/')) {
    return url.replace(
      '/storage/v1/object/public/',
      `/storage/v1/render/image/public/`
    ) + `?width=${width}&resize=contain`;
  }
  // Unsplash: adjust w & q params
  if (url.includes('images.unsplash.com')) {
    const u = new URL(url);
    u.searchParams.set('w', String(width));
    u.searchParams.set('q', '75');
    u.searchParams.set('fm', 'webp');
    return u.toString();
  }
  return url;
};

const PropertyCard = ({ id, title, price, type, imageUrl, locationName, areaSqft, areaValue, areaUnit, propertyPublicId }: PropertyCardProps) => (
  <Link to={propertyPublicId ? buildPropertyUrl(title, propertyPublicId) : `/properties/${id}`} className="group block">
    <Card className="overflow-hidden border-transparent bg-card shadow-sm transition-all duration-300 hover:border-border hover:shadow-lg">
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        {imageUrl ? (
          <img
            src={getOptimizedImageUrl(imageUrl, 480)}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            width={400}
            height={300}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No Image
          </div>
        )}
      </div>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="capitalize text-xs font-medium">
            {type}
          </Badge>
          {(areaSqft || areaValue) && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Maximize className="h-3 w-3" />
              {formatAreaWithUnit(areaValue ?? null, areaUnit ?? null, areaSqft ?? null)}
            </span>
          )}
        </div>
        <h3 className="mt-2 font-heading text-sm font-semibold leading-snug line-clamp-2 sm:mt-2.5 sm:text-base">{title}</h3>
        {locationName && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground sm:mt-1.5 sm:text-sm">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{locationName}</span>
          </p>
        )}
        <p className="mt-2 font-heading text-base font-bold text-primary sm:mt-3 sm:text-lg">
          NPR {price.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  </Link>
);

export default PropertyCard;
