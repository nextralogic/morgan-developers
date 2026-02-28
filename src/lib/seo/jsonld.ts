import { SITE_NAME, SITE_URL } from "./constants";
import { buildPropertyUrl } from "@/lib/property-url";

interface PropertyJsonLdInput {
  title: string;
  description?: string | null;
  price: number;
  type: string;
  areaSqft?: number | null;
  areaValue?: number | null;
  areaUnit?: string | null;
  propertyPublicId: number;
  primaryImageUrl?: string | null;
  location?: {
    display_name?: string | null;
    province?: string | null;
    district?: string | null;
    municipality_or_city?: string | null;
    ward?: number | null;
    area_name?: string | null;
  } | null;
}

export function buildPropertyJsonLd(p: PropertyJsonLdInput) {
  const url = `${SITE_URL}${buildPropertyUrl(p.title, p.propertyPublicId)}`;

  const address: Record<string, string> = { "@type": "PostalAddress" };
  if (p.location?.area_name) address.streetAddress = p.location.area_name;
  if (p.location?.municipality_or_city) address.addressLocality = p.location.municipality_or_city;
  if (p.location?.district) address.addressRegion = p.location.district;
  if (p.location?.province) address.addressRegion = `${p.location.province}${address.addressRegion ? `, ${address.addressRegion}` : ""}`;
  address.addressCountry = "NP";

  const areaText = p.areaValue && p.areaUnit
    ? `${p.areaValue} ${p.areaUnit}`
    : p.areaSqft
      ? `${p.areaSqft} sq ft`
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: p.title,
    description: p.description ?? `${p.type} for sale in Nepal`,
    url,
    ...(p.primaryImageUrl ? { image: p.primaryImageUrl } : {}),
    offers: {
      "@type": "Offer",
      price: p.price,
      priceCurrency: "NPR",
      availability: "https://schema.org/InStock",
    },
    address,
    ...(areaText ? { floorSize: { "@type": "QuantitativeValue", value: areaText } } : {}),
    provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
}
