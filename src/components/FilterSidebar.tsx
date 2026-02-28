import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import NepalAddressSelect from "@/components/NepalAddressSelect";
import type { NepalAddress } from "@/utils/nepalAddress";

interface FilterSidebarProps {
  propertyType: string;
  onPropertyTypeChange: (value: string) => void;
  priceRange: [number, number];
  onPriceRangeChange: (value: [number, number]) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  locationAddress: NepalAddress;
  onLocationAddressChange: (addr: NepalAddress) => void;
  onReset: () => void;
}

const FilterSidebar = ({
  propertyType,
  onPropertyTypeChange,
  priceRange,
  onPriceRangeChange,
  sortBy,
  onSortByChange,
  locationAddress,
  onLocationAddressChange,
  onReset,
}: FilterSidebarProps) => (
  <aside className="space-y-7 rounded-xl border bg-card p-6">
    {/* Location */}
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Location
      </h3>
      <NepalAddressSelect value={locationAddress} onChange={onLocationAddressChange} compact />
    </div>

    {/* Property Type */}
    <div>
      <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Property Type
      </Label>
      <Select value={propertyType} onValueChange={onPropertyTypeChange}>
        <SelectTrigger className="mt-2">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="apartment">Apartment</SelectItem>
          <SelectItem value="house">House</SelectItem>
          <SelectItem value="land">Land</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Sort By */}
    <div>
      <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Sort By
      </Label>
      <Select value={sortBy} onValueChange={onSortByChange}>
        <SelectTrigger className="mt-2">
          <SelectValue placeholder="Newest" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="price_low">Price: Low to High</SelectItem>
          <SelectItem value="price_high">Price: High to Low</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Price Range */}
    <div>
      <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Price Range (NPR)
      </Label>
      <Slider
        className="mt-4"
        min={0}
        max={50_000_000}
        step={500_000}
        value={priceRange}
        onValueChange={(v) => onPriceRangeChange(v as [number, number])}
      />
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{priceRange[0].toLocaleString()}</span>
        <span>{priceRange[1].toLocaleString()}</span>
      </div>
    </div>

    <Button variant="outline" size="sm" className="w-full gap-2" onClick={onReset}>
      <RotateCcw className="h-3.5 w-3.5" />
      Reset Filters
    </Button>
  </aside>
);

export default FilterSidebar;
