import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { PropertySearchFilters } from "@/services/propertySearchService";

const formatPrice = (v: number) => {
  if (v >= 10_000_000) return `${(v / 10_000_000).toFixed(v % 10_000_000 === 0 ? 0 : 1)} Cr`;
  if (v >= 100_000) return `${(v / 100_000).toFixed(v % 100_000 === 0 ? 0 : 1)} L`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return v.toLocaleString();
};

interface ActiveFiltersProps {
  filters: PropertySearchFilters;
  onUpdate: (patch: Partial<PropertySearchFilters>) => void;
  onReset: () => void;
}

const ActiveFilters = ({ filters, onUpdate, onReset }: ActiveFiltersProps) => {
  const badges: { label: string; onRemove: () => void }[] = [];

  if (filters.query) {
    badges.push({ label: `"${filters.query}"`, onRemove: () => onUpdate({ query: undefined }) });
  }
  if (filters.type) {
    badges.push({ label: filters.type.charAt(0).toUpperCase() + filters.type.slice(1), onRemove: () => onUpdate({ type: undefined }) });
  }
  if (filters.province) {
    badges.push({ label: filters.province, onRemove: () => onUpdate({ province: undefined, district: undefined, municipalityOrCity: undefined }) });
  }
  if (filters.district) {
    badges.push({ label: filters.district, onRemove: () => onUpdate({ district: undefined, municipalityOrCity: undefined }) });
  }
  if (filters.municipalityOrCity) {
    badges.push({ label: filters.municipalityOrCity, onRemove: () => onUpdate({ municipalityOrCity: undefined }) });
  }
  if ((filters.minPrice && filters.minPrice > 0) || (filters.maxPrice && filters.maxPrice < 50_000_000)) {
    const min = filters.minPrice ?? 0;
    const max = filters.maxPrice ?? 50_000_000;
    badges.push({
      label: `NPR ${formatPrice(min)} – ${formatPrice(max)}`,
      onRemove: () => onUpdate({ minPrice: undefined, maxPrice: undefined }),
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {badges.map((b, i) => (
        <Badge key={i} variant="secondary" className="gap-1 pl-2.5 pr-1.5 py-1 text-xs font-medium">
          {b.label}
          <button onClick={b.onRemove} className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {badges.length > 1 && (
        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={onReset}>
          Clear all
        </Button>
      )}
    </div>
  );
};

export default ActiveFilters;
