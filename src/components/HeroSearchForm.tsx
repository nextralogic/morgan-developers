import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Search } from "lucide-react";
import { getProvinces, getDistricts, getMunicipalities, type NepalAddress } from "@/utils/nepalAddress";
import { filtersToParams, type PropertySearchFilters } from "@/services/propertySearchService";

const HeroSearchForm = () => {
  const { t } = useTranslation(["home", "common"]);
  const navigate = useNavigate();
  const [address, setAddress] = useState<NepalAddress>({ province: "", district: "", municipality_or_city: "", ward: null, area_name: "" });
  const [type, setType] = useState("all");
  const [price, setPrice] = useState<[number, number]>([0, 50_000_000]);

  const provinces = useMemo(() => getProvinces(), []);
  const districts = useMemo(() => getDistricts(address.province), [address.province]);
  const municipalities = useMemo(() => getMunicipalities(address.district), [address.district]);

  const formatPrice = (value: number) => {
    if (value >= 10_000_000) {
      return t("search.priceUnits.crore", {
        ns: "home",
        value: (value / 10_000_000).toFixed(value % 10_000_000 === 0 ? 0 : 1),
      });
    }
    if (value >= 100_000) {
      return t("search.priceUnits.lakh", {
        ns: "home",
        value: (value / 100_000).toFixed(value % 100_000 === 0 ? 0 : 1),
      });
    }
    if (value >= 1000) {
      return t("search.priceUnits.thousand", {
        ns: "home",
        value: (value / 1000).toFixed(0),
      });
    }
    return value.toLocaleString();
  };

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
            {t("search.province", { ns: "home" })}
          </label>
          <Select
            value={address.province || "__none"}
            onValueChange={(v) =>
              setAddress({ province: v === "__none" ? "" : v, district: "", municipality_or_city: "", ward: null, area_name: "" })
            }
          >
            <SelectTrigger className="text-xs sm:text-sm"><SelectValue placeholder={t("search.allProvinces", { ns: "home" })} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">{t("search.allProvinces", { ns: "home" })}</SelectItem>
              {provinces.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-[11px]">
            {t("search.district", { ns: "home" })}
          </label>
          <Select
            value={address.district || "__none"}
            onValueChange={(v) =>
              setAddress({ ...address, district: v === "__none" ? "" : v, municipality_or_city: "", ward: null })
            }
            disabled={!address.province}
          >
            <SelectTrigger className="text-xs sm:text-sm"><SelectValue placeholder={address.province ? t("search.allDistricts", { ns: "home" }) : t("search.provinceFirst", { ns: "home" })} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">{t("search.allDistricts", { ns: "home" })}</SelectItem>
              {districts.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-[11px]">
            {t("search.municipality", { ns: "home" })}
          </label>
          <Select
            value={address.municipality_or_city || "__none"}
            onValueChange={(v) =>
              setAddress({ ...address, municipality_or_city: v === "__none" ? "" : v })
            }
            disabled={!address.district}
          >
            <SelectTrigger className="text-xs sm:text-sm"><SelectValue placeholder={address.district ? t("search.allMunicipalities", { ns: "home" }) : t("search.districtFirst", { ns: "home" })} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">{t("search.allMunicipalities", { ns: "home" })}</SelectItem>
              {municipalities.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-[11px]">
            {t("search.propertyType", { ns: "home" })}
          </label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="text-xs sm:text-sm"><SelectValue placeholder={t("search.allTypes", { ns: "home" })} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("search.allTypes", { ns: "home" })}</SelectItem>
              <SelectItem value="apartment">{t("property.types.apartment", { ns: "common" })}</SelectItem>
              <SelectItem value="house">{t("property.types.house", { ns: "common" })}</SelectItem>
              <SelectItem value="land">{t("property.types.land", { ns: "common" })}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2: Price slider + search */}
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
        <div className="flex-1 min-w-0">
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-[11px]">
            {t("search.priceRange", { ns: "home" })}
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
              <span>{t("currency.npr", { ns: "common", amount: formatPrice(price[0]) })}</span>
              <span>{t("currency.npr", { ns: "common", amount: formatPrice(price[1]) })}</span>
            </div>
          </div>
        </div>

        <Button onClick={handleSearch} className="h-11 w-full shrink-0 gap-2 rounded-xl sm:h-[48px] sm:w-auto sm:px-8" size="lg">
          <Search className="h-4 w-4" />
          {t("search.search", { ns: "home" })}
        </Button>
      </div>
    </div>
  );
};

export default HeroSearchForm;
