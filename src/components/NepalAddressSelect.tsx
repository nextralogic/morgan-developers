import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getProvinces, getDistricts, getMunicipalities, filterOptions, type NepalAddress } from "@/utils/nepalAddress";
import { useTranslation } from "react-i18next";

interface NepalAddressSelectProps {
  value: NepalAddress;
  onChange: (addr: NepalAddress) => void;
  /** If true, hides ward + area_name fields (for filter use) */
  compact?: boolean;
  /** If true, renders province/district/municipality in a horizontal row */
  horizontal?: boolean;
}

const NepalAddressSelect = ({ value, onChange, compact = false, horizontal = false }: NepalAddressSelectProps) => {
  const { t } = useTranslation("properties");
  const [provinceSearch, setProvinceSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [municipalitySearch, setMunicipalitySearch] = useState("");

  const provinces = useMemo(() => getProvinces(), []);
  const districts = useMemo(() => getDistricts(value.province), [value.province]);
  const municipalities = useMemo(() => getMunicipalities(value.district), [value.district]);

  const filteredProvinces = useMemo(() => filterOptions(provinces, provinceSearch), [provinces, provinceSearch]);
  const filteredDistricts = useMemo(() => filterOptions(districts, districtSearch), [districts, districtSearch]);
  const filteredMunicipalities = useMemo(() => filterOptions(municipalities, municipalitySearch), [municipalities, municipalitySearch]);

  // Reset downstream when upstream changes
  useEffect(() => {
    if (value.province && districts.length > 0 && value.district) {
      if (!districts.some((d) => d.value === value.district)) {
        onChange({ ...value, district: "", municipality_or_city: "", ward: null, area_name: "" });
      }
    }
  }, [value.province]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (value.district && municipalities.length > 0 && value.municipality_or_city) {
      if (!municipalities.some((m) => m.value === value.municipality_or_city)) {
        onChange({ ...value, municipality_or_city: "", ward: null, area_name: "" });
      }
    }
  }, [value.district]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={horizontal ? "grid gap-3 grid-cols-1 sm:grid-cols-3" : "space-y-3"}>
      {/* Province */}
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("address.province")} {!compact && "*"}
        </Label>
        <Select
          value={value.province || "__none"}
          onValueChange={(v) =>
            onChange({ province: v === "__none" ? "" : v, district: "", municipality_or_city: "", ward: null, area_name: value.area_name })
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder={t("address.selectProvince")} />
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 pb-1.5">
              <Input
                placeholder={t("address.searchProvince")}
                className="h-8"
                value={provinceSearch}
                onChange={(e) => setProvinceSearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
            <SelectItem value="__none">{t("address.allProvinces")}</SelectItem>
            {filteredProvinces.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* District */}
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("address.district")} {!compact && "*"}
        </Label>
        <Select
          value={value.district || "__none"}
          onValueChange={(v) =>
            onChange({ ...value, district: v === "__none" ? "" : v, municipality_or_city: "", ward: null })
          }
          disabled={!value.province}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder={value.province ? t("address.selectDistrict") : t("address.selectProvinceFirst")} />
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 pb-1.5">
              <Input
                placeholder={t("address.searchDistrict")}
                className="h-8"
                value={districtSearch}
                onChange={(e) => setDistrictSearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
            <SelectItem value="__none">{t("address.allDistricts")}</SelectItem>
            {filteredDistricts.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Municipality */}
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("address.municipality")} {!compact && "*"}
        </Label>
        <Select
          value={value.municipality_or_city || "__none"}
          onValueChange={(v) =>
            onChange({ ...value, municipality_or_city: v === "__none" ? "" : v })
          }
          disabled={!value.district}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder={value.district ? t("address.selectMunicipality") : t("address.selectDistrictFirst")} />
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 pb-1.5">
              <Input
                placeholder={t("address.searchMunicipality")}
                className="h-8"
                value={municipalitySearch}
                onChange={(e) => setMunicipalitySearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
            <SelectItem value="__none">{t("address.allMunicipalities")}</SelectItem>
            {filteredMunicipalities.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ward + Area Name (only in full mode) */}
      {!compact && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("address.wardOptional")}
            </Label>
            <Input
              type="number"
              min={1}
              max={35}
              placeholder={t("address.wardPlaceholder")}
              className="mt-1"
              value={value.ward ?? ""}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : null;
                onChange({ ...value, ward: v });
              }}
            />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("address.areaNameRecommended")}
            </Label>
            <Input
              placeholder={t("address.areaNamePlaceholder")}
              className="mt-1"
              value={value.area_name ?? ""}
              onChange={(e) => onChange({ ...value, area_name: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default NepalAddressSelect;
