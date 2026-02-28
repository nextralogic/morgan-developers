import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Search } from "lucide-react";
import { getProvinces, getDistricts, getMunicipalities, type NepalAddress } from "@/utils/nepalAddress";
import { filtersToParams, type PropertySearchFilters } from "@/services/propertySearchService";

const formatPrice = (v: number) => {
  if (v >= 10_000_000) return `${(v / 10_000_000).toFixed(v % 10_000_000 === 0 ? 0 : 1)} Cr`;
  if (v >= 100_000) return `${(v / 100_000).toFixed(v % 100_000 === 0 ? 0 : 1)} L`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return v.toLocaleString();
};

const HeroSearchForm = () => {
  const navigate = useNavigate();
  const [address, setAddress] = useState<NepalAddress>({ province: "", district: "", municipality_or_city: "", ward: null, area_name: "" });
  const [type, setType] = useState("all");
  const [price, setPrice] = useState<[number, number]>([0, 50_000_000]);

  const provinces = useMemo(() => getProvinces(), []);
  const districts = useMemo(() => getDistricts(address.province), [address.province]);
  const municipalities = useMemo(() => getMunicipalities(address.district), [address.district]);

  const handleSearch = () => {
    const filters: PropertySearchFilters = {
      province: address.province || undefined,
      district: address.district || undefined,
      municipalityOrCity: address.municipality_or_city || undefined,
      type: type !== "all" ? (type as PropertySearchFilters["type"]) : undefined,
      minPrice: price[0] > 0 ? price[0] : undefined,
      maxPrice: price[1] < 50_000_000 ? price[1] : undefined,
    };
    navigate(`/properties?${filtersToParams(filters).toString()}`);
  };

  return (
    <div className="rounded-2xl border border-primary-foreground/10 bg-card/95 p-5 shadow-2xl backdrop-blur-md sm:p-6 md:p-8">
      {/* Row 1: Filters grid */}
      <div className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-[11px]">
            Province
          </label>
          <Select
            value={address.province || "__none"}
            onValueChange={(v) =>
              setAddress({ province: v === "__none" ? "" : v, district: "", municipality_or_city: "", ward: null, area_name: "" })
            }
          >
            <SelectTrigger className="text-xs sm:text-sm"><SelectValue placeholder="All Provinces" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">All Provinces</SelectItem>
              {provinces.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-[11px]">
            District
          </label>
          <Select
            value={address.district || "__none"}
            onValueChange={(v) =>
              setAddress({ ...address, district: v === "__none" ? "" : v, municipality_or_city: "", ward: null })
            }
            disabled={!address.province}
          >
            <SelectTrigger className="text-xs sm:text-sm"><SelectValue placeholder={address.province ? "All Districts" : "Province first"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">All Districts</SelectItem>
              {districts.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-[11px]">
            Municipality
          </label>
          <Select
            value={address.municipality_or_city || "__none"}
            onValueChange={(v) =>
              setAddress({ ...address, municipality_or_city: v === "__none" ? "" : v })
            }
            disabled={!address.district}
          >
            <SelectTrigger className="text-xs sm:text-sm"><SelectValue placeholder={address.district ? "All" : "District first"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">All Municipalities</SelectItem>
              {municipalities.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-[11px]">
            Property Type
          </label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="text-xs sm:text-sm"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="apartment">Apartment</SelectItem>
              <SelectItem value="house">House</SelectItem>
              <SelectItem value="land">Land</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2: Price slider + search */}
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
        <div className="flex-1 min-w-0">
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-[11px]">
            Price Range (NPR)
          </label>
          <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
            <Slider
              min={0}
              max={50_000_000}
              step={500_000}
              value={price}
              onValueChange={(v) => setPrice(v as [number, number])}
            />
            <div className="mt-2 flex justify-between text-[11px] font-medium text-foreground/70 sm:text-xs">
              <span>NPR {formatPrice(price[0])}</span>
              <span>NPR {formatPrice(price[1])}</span>
            </div>
          </div>
        </div>

        <Button onClick={handleSearch} className="h-11 w-full shrink-0 gap-2 rounded-xl sm:h-[48px] sm:w-auto sm:px-8" size="lg">
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>
    </div>
  );
};

export default HeroSearchForm;
