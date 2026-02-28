import infoNepal from "info-nepal";

export interface ProvinceOption {
  label: string;
  value: string;
}

export interface DistrictOption {
  label: string;
  value: string;
}

export interface MunicipalityOption {
  label: string;
  value: string;
}

export interface NepalAddress {
  province: string;
  district: string;
  municipality_or_city: string;
  ward?: number | null;
  area_name?: string | null;
}

/** Map province numbers to official names */
const PROVINCE_NAMES: Record<string, string> = {
  "1": "Koshi Province",
  "2": "Madhesh Province",
  "3": "Bagmati Province",
  "4": "Gandaki Province",
  "5": "Lumbini Province",
  "6": "Karnali Province",
  "7": "Sudurpashchim Province",
};

/** Reverse map: name → number key */
const PROVINCE_KEYS: Record<string, string> = Object.fromEntries(
  Object.entries(PROVINCE_NAMES).map(([k, v]) => [v, k])
);

/** Get all provinces with proper names */
export function getProvinces(): ProvinceOption[] {
  return Object.entries(PROVINCE_NAMES)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, name]) => ({ label: name, value: name }));
}

/** Get districts for a given province name */
export function getDistricts(province: string): DistrictOption[] {
  const key = PROVINCE_KEYS[province] || province;
  const districts = infoNepal.districtsOfProvince[key];
  if (!districts) return [];
  return [...districts].sort().map((d) => ({ label: d, value: d }));
}

/** Get municipalities/local bodies for a given district */
export function getMunicipalities(district: string): MunicipalityOption[] {
  const bodies = infoNepal.localBodies[district];
  if (!bodies) return [];
  return [...bodies].sort().map((m) => ({ label: m, value: m }));
}

/** Build a display name from address parts */
export function buildDisplayName(addr: NepalAddress): string {
  const parts: string[] = [];
  if (addr.area_name?.trim()) parts.push(addr.area_name.trim());
  if (addr.ward) parts.push(`Ward ${addr.ward}`);
  if (addr.municipality_or_city) parts.push(addr.municipality_or_city);
  if (addr.district) parts.push(addr.district);
  if (addr.province) parts.push(addr.province);
  return parts.join(", ");
}

/** Build a normalized search key */
export function buildSearchKey(addr: NepalAddress): string {
  return [
    addr.province,
    addr.district,
    addr.municipality_or_city,
    addr.ward ? `ward ${addr.ward}` : "",
    addr.area_name || "",
  ]
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Filter options by search term */
export function filterOptions<T extends { label: string }>(options: T[], query: string): T[] {
  if (!query.trim()) return options;
  const q = query.toLowerCase();
  return options.filter((o) => o.label.toLowerCase().includes(q));
}
