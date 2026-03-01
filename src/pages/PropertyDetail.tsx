import { useMemo, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { logPropertyView } from "@/services/analyticsService";
import { supabase } from "@/integrations/supabase/client";
import { parsePropertyPublicId, isUUID, buildPropertyUrl } from "@/lib/property-url";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LeadForm from "@/components/LeadForm";
import ImageGallery from "@/components/ImageGallery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Ruler, ArrowLeft, Home, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShareButtons from "@/components/ShareButtons";
import { formatAreaWithUnit } from "@/lib/area-utils";
import { usePageMeta } from "@/lib/seo/usePageMeta";
import { SITE_URL } from "@/lib/seo/constants";
import { buildPropertyJsonLd } from "@/lib/seo/propertyJsonld";
import JsonLd from "@/lib/seo/StructuredDataScript";

const PropertyDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const propertyPublicId = slug ? parsePropertyPublicId(slug) : null;
  const isOldUUID = slug ? isUUID(slug) : false;

  const { data: property, isLoading } = useQuery({
    queryKey: ["property", slug],
    queryFn: async () => {
      let query = supabase
        .from("properties")
        .select("*, locations(id, display_name, province, district, municipality_or_city, ward, area_name), property_images(*)")
        .single();

      if (propertyPublicId) {
        query = supabase
          .from("properties")
          .select("*, locations(id, display_name, province, district, municipality_or_city, ward, area_name), property_images(*)")
          .eq("property_public_id", propertyPublicId)
          .single();
      } else if (isOldUUID) {
        query = supabase
          .from("properties")
          .select("*, locations(id, display_name, province, district, municipality_or_city, ward, area_name), property_images(*)")
          .eq("id", slug!)
          .single();
      } else {
        throw new Error("Invalid property URL");
      }

      const { data, error } = await query;
      if (error) throw error;
      // Block soft-deleted or non-published properties for public users
      if (data && ((data as any).is_deleted === true || (data as any).status !== "published")) {
        return null;
      }
      return data;
    },
    enabled: !!slug,
    retry: false,
  });

  useEffect(() => {
    if (property && isOldUUID) {
      const canonical = buildPropertyUrl(property.title, (property as any).property_public_id);
      navigate(canonical, { replace: true });
    }
  }, [property, isOldUUID, navigate]);

  useEffect(() => {
    if (property && propertyPublicId && slug) {
      const canonical = buildPropertyUrl(property.title, (property as any).property_public_id);
      const expectedSlug = canonical.replace("/properties/", "");
      if (slug !== expectedSlug) {
        navigate(canonical, { replace: true });
      }
    }
  }, [property, propertyPublicId, slug, navigate]);

  const { data: amenities } = useQuery({
    queryKey: ["property-amenities", property?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_amenities")
        .select("amenity_id, amenities(name, icon)")
        .eq("property_id", property!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!property?.id,
  });

  const locationPath = useMemo(() => {
    const loc = property?.locations as any;
    if (!loc) return [];
    const parts: { id: string; name: string }[] = [];
    if (loc.area_name) parts.push({ id: "area", name: loc.area_name });
    if (loc.ward) parts.push({ id: "ward", name: `Ward ${loc.ward}` });
    if (loc.municipality_or_city) parts.push({ id: "mun", name: loc.municipality_or_city });
    if (loc.district) parts.push({ id: "dist", name: loc.district });
    if (loc.province) parts.push({ id: "prov", name: loc.province });
    return parts;
  }, [property]);

  // --- SEO: must be called unconditionally (before early returns) ---
  const images = property ? ((property.property_images as any[]) || []) : [];
  const location = property ? (property.locations as any) : null;
  const primaryImg = images.find((img: any) => img.is_primary) ?? images[0];

  const canonicalUrl = property
    ? `${SITE_URL}${buildPropertyUrl(property.title, (property as any).property_public_id)}`
    : undefined;
  const descSnippet = property?.description
    ? property.description.slice(0, 155).replace(/\s+\S*$/, "…")
    : property
      ? `${property.type} for sale in Nepal — NPR ${Number(property.price).toLocaleString()}`
      : "Property listing on Morgan Developers";

  usePageMeta({
    title: property?.title ?? "Property",
    description: descSnippet,
    canonicalUrl,
    ogType: "product",
    ogImage: primaryImg?.image_url,
    ogUrl: canonicalUrl,
  });

  const jsonLd = property
    ? buildPropertyJsonLd({
        title: property.title,
        description: property.description,
        price: Number(property.price),
        type: property.type,
        areaSqft: property.area_sqft ? Number(property.area_sqft) : null,
        areaValue: (property as any).area_value ? Number((property as any).area_value) : null,
        areaUnit: (property as any).area_unit,
        propertyPublicId: (property as any).property_public_id,
        primaryImageUrl: primaryImg?.image_url,
        location,
      })
    : null;

  // --- Track property view (best-effort, once per mount for published properties) ---
  const viewLogged = useRef(false);
  useEffect(() => {
    if (property && property.status === "published" && !viewLogged.current) {
      viewLogged.current = true;
      logPropertyView(property.id);
    }
  }, [property]);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="container page-padding">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="mt-6 h-8 w-2/3" />
          <Skeleton className="mt-3 h-4 w-1/3" />
        </main>
        <Footer />
      </>
    );
  }

  if (!property) {
    return (
      <>
        <Navbar />
        <main className="container flex min-h-[60vh] flex-col items-center justify-center text-center">
          <Home className="h-12 w-12 text-muted-foreground/30" />
          <h1 className="mt-4 font-heading text-2xl font-bold">Property Not Found</h1>
          <p className="mt-2 max-w-sm text-muted-foreground">This property may have been removed or is no longer available.</p>
          <Button asChild variant="outline" className="mt-6 gap-2">
            <Link to="/properties"><ArrowLeft className="h-4 w-4" /> Back to Listings</Link>
          </Button>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      <Navbar />
      <main className="container page-padding">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2 gap-1 text-muted-foreground hover:text-foreground">
          <Link to="/properties"><ArrowLeft className="h-4 w-4" /> All Properties</Link>
        </Button>

        <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-12">
          <div className="min-w-0 space-y-8 sm:space-y-10">
            <ImageGallery images={images} title={property.title} />

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="capitalize">{property.type}</Badge>
                <Badge variant={property.status === "published" ? "default" : "outline"} className="capitalize">
                  {property.status}
                </Badge>
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  ID: {(property as any).property_public_id}
                </Badge>
              </div>
              <h1 className="mt-3 font-heading text-2xl font-bold md:text-3xl">{property.title}</h1>

              {locationPath && locationPath.length > 0 && (
                <p className="mt-2 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 flex-shrink-0 text-primary" />
                  {locationPath.map((loc, i) => (
                    <span key={loc.id}>
                      {loc.name}
                      {i < locationPath.length - 1 && <span className="mx-0.5 text-border">›</span>}
                    </span>
                  ))}
                </p>
              )}

              <p className="mt-4 font-heading text-2xl font-bold text-primary sm:text-3xl">
                NPR {Number(property.price).toLocaleString()}
              </p>

              <div className="mt-4">
                <ShareButtons title={property.title} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {(property.area_sqft || (property as any).area_value) && (
                <div className="rounded-xl border bg-card p-4 text-center sm:p-5">
                  <Ruler className="mx-auto h-5 w-5 text-primary" />
                  <p className="mt-2 text-xs font-semibold sm:text-sm">
                    {formatAreaWithUnit((property as any).area_value, (property as any).area_unit, property.area_sqft ? Number(property.area_sqft) : null)}
                  </p>
                  <p className="text-xs text-muted-foreground">Area</p>
                </div>
              )}
              <div className="rounded-xl border bg-card p-4 text-center sm:p-5">
                <Layers className="mx-auto h-5 w-5 text-primary" />
                <p className="mt-2 text-xs font-semibold capitalize sm:text-sm">{property.type}</p>
                <p className="text-xs text-muted-foreground">Type</p>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center sm:p-5">
                <div className={`mx-auto h-2.5 w-2.5 rounded-full ${property.status === "published" ? "bg-green-500" : property.status === "sold" ? "bg-red-400" : "bg-muted-foreground"}`} />
                <p className="mt-2 text-xs font-semibold capitalize sm:text-sm">{property.status}</p>
                <p className="text-xs text-muted-foreground">Status</p>
              </div>
            </div>

            {property.description && (
              <div>
                <h2 className="font-heading text-xl font-semibold">Description</h2>
                <p className="mt-3 leading-relaxed text-muted-foreground whitespace-pre-line">
                  {property.description}
                </p>
              </div>
            )}

            {amenities && amenities.length > 0 && (
              <div>
                <h2 className="font-heading text-xl font-semibold">Amenities</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {amenities.map((pa: any) => (
                    <Badge key={pa.amenity_id} variant="outline" className="gap-1.5 rounded-full px-3.5 py-1.5 text-sm">
                      {pa.amenities?.icon && <span>{pa.amenities.icon}</span>}
                      {pa.amenities?.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {location && (
              <div>
                <h2 className="font-heading text-xl font-semibold">Location</h2>
                <div className="mt-4 aspect-[2/1] overflow-hidden rounded-xl border bg-muted flex items-center justify-center text-sm text-muted-foreground">
                  <div className="text-center px-4">
                    <MapPin className="mx-auto h-8 w-8 text-primary/40" />
                    <p className="mt-2 font-medium">{location.display_name || location.municipality_or_city || "Location"}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground/60">Interactive map coming soon</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <Card className="sticky top-20 rounded-xl shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="font-heading text-lg">Interested in this property?</CardTitle>
                <p className="text-sm text-muted-foreground">Fill out the form and we'll get back to you shortly.</p>
              </CardHeader>
              <CardContent>
                <LeadForm propertyId={property.id} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default PropertyDetail;
