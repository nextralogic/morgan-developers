import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import NepalAddressSelect from "@/components/NepalAddressSelect";
import type { NepalAddress } from "@/utils/nepalAddress";
import { useTranslation } from "react-i18next";

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
}: FilterSidebarProps) => {
  const { t } = useTranslation(["properties", "common"]);

  return (
    <aside className="space-y-7 rounded-xl border bg-card p-6">
      {/* Location */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("filters.location", { ns: "properties" })}
        </h3>
        <NepalAddressSelect value={locationAddress} onChange={onLocationAddressChange} compact />
      </div>

      {/* Property Type */}
      <div>
        <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("filters.propertyType", { ns: "properties" })}
        </Label>
        <Select value={propertyType} onValueChange={onPropertyTypeChange}>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder={t("filters.allTypes", { ns: "properties" })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.allTypes", { ns: "properties" })}</SelectItem>
            <SelectItem value="apartment">{t("property.types.apartment", { ns: "common" })}</SelectItem>
            <SelectItem value="house">{t("property.types.house", { ns: "common" })}</SelectItem>
            <SelectItem value="land">{t("property.types.land", { ns: "common" })}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sort By */}
      <div>
        <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("filters.sortBy", { ns: "properties" })}
        </Label>
        <Select value={sortBy} onValueChange={onSortByChange}>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder={t("filters.sortOptions.newest", { ns: "properties" })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("filters.sortOptions.newest", { ns: "properties" })}</SelectItem>
            <SelectItem value="price_low">{t("filters.sortOptions.priceLow", { ns: "properties" })}</SelectItem>
            <SelectItem value="price_high">{t("filters.sortOptions.priceHigh", { ns: "properties" })}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div>
        <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("filters.priceRange", { ns: "properties" })}
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
        {t("filters.reset", { ns: "properties" })}
      </Button>
    </aside>
  );
};

export default FilterSidebar;
