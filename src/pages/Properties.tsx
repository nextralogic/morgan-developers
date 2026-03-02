import { useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import SearchBar from "@/components/SearchBar";
import FilterSidebar from "@/components/FilterSidebar";
import ActiveFilters from "@/components/ActiveFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { SearchX, SlidersHorizontal } from "lucide-react";
import PropertyPagination from "@/components/PropertyPagination";
import { searchProperties, filtersFromParams, filtersToParams, type PropertySearchFilters } from "@/services/propertySearchService";
import type { NepalAddress } from "@/utils/nepalAddress";
import { useState } from "react";
import { usePageMeta } from "@/lib/seo/usePageMeta";
import { SITE_URL } from "@/lib/seo/constants";
import { useTranslation } from "react-i18next";

const EMPTY_ADDRESS: NepalAddress = { province: "", district: "", municipality_or_city: "", ward: null, area_name: "" };

const Properties = () => {
  const { t } = useTranslation(["properties", "common"]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);

  usePageMeta({
    title: t("meta.title", { ns: "properties" }),
    description: t("meta.description", { ns: "properties" }),
    canonicalUrl: `${SITE_URL}/properties`,
    ogType: "website",
  });

  // Derive filters from URL
  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams]);

  // Helper to update URL params (source of truth)
  const updateFilters = useCallback(
    (patch: Partial<PropertySearchFilters>) => {
      const next = { ...filters, ...patch, page: patch.page ?? 1 };
      setSearchParams(filtersToParams(next), { replace: true });
    },
    [filters, setSearchParams]
  );

  // Search query
  const { data: result, isLoading } = useQuery({
    queryKey: ["properties-search", filters],
    queryFn: () => searchProperties(filters),
    placeholderData: (prev) => prev, // keep previous data while loading
  });

  const paginated = result?.data ?? [];
  const totalCount = result?.totalCount ?? 0;
  const page = result?.page ?? 1;
  const pageSize = result?.pageSize ?? 12;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Map filters to sidebar props
  const locationAddress: NepalAddress = {
    province: filters.province ?? "",
    district: filters.district ?? "",
    municipality_or_city: filters.municipalityOrCity ?? "",
    ward: null,
    area_name: "",
  };

  const resetFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const activeFilterCount = [
    filters.type,
    filters.province,
    (filters.minPrice && filters.minPrice > 0) || (filters.maxPrice && filters.maxPrice < 50_000_000),
    filters.sort && filters.sort !== "newest",
  ].filter(Boolean).length;

  const filterSidebarContent = (
    <FilterSidebar
      propertyType={filters.type ?? "all"}
      onPropertyTypeChange={(v) => updateFilters({ type: v === "all" ? undefined : v as PropertySearchFilters["type"] })}
      priceRange={[filters.minPrice ?? 0, filters.maxPrice ?? 50_000_000]}
      onPriceRangeChange={(v) => updateFilters({ minPrice: v[0], maxPrice: v[1] })}
      sortBy={filters.sort ?? "newest"}
      onSortByChange={(v) => updateFilters({ sort: v as PropertySearchFilters["sort"] })}
      locationAddress={locationAddress}
      onLocationAddressChange={(addr) =>
        updateFilters({
          province: addr.province || undefined,
          district: addr.district || undefined,
          municipalityOrCity: addr.municipality_or_city || undefined,
        })
      }
      onReset={resetFilters}
    />
  );

  return (
    <>
      <Navbar />
      <main className="container page-padding">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">{t("header.eyebrow", { ns: "properties" })}</p>
          <h1 className="mt-1 font-heading">{t("header.title", { ns: "properties" })}</h1>
          <p className="mt-2 max-w-md text-muted-foreground">{t("header.description", { ns: "properties" })}</p>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1">
            <SearchBar
              value={filters.query ?? ""}
              onChange={(v) => updateFilters({ query: v || undefined })}
            />
          </div>
          {/* Mobile filter toggle */}
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative h-11 w-11 shrink-0 rounded-xl lg:hidden">
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[320px] overflow-y-auto p-0">
              <SheetTitle className="sr-only">{t("filters.title", { ns: "properties" })}</SheetTitle>
              <div className="p-6">{filterSidebarContent}</div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Active filter badges */}
        <ActiveFilters filters={filters} onUpdate={updateFilters} onReset={resetFilters} />

        <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Desktop sidebar */}
          <div className="hidden lg:block">
            {filterSidebarContent}
          </div>

          <div>
            {isLoading && !result ? (
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                ))}
              </div>
            ) : paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-20 text-center">
                <SearchX className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-4 font-heading text-lg font-semibold">{t("results.noneTitle", { ns: "properties" })}</p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  {t("results.noneDescription", { ns: "properties" })}
                </p>
                <Button variant="outline" size="sm" className="mt-5" onClick={resetFilters}>
                  {t("results.clearAllFilters", { ns: "properties" })}
                </Button>
              </div>
            ) : (
              <>
                <p className="mb-5 text-sm text-muted-foreground">
                  {t("results.found", { ns: "properties", count: totalCount })}
                  {filters.sort && filters.sort !== "newest" && (
                    <span className="ml-1">
                      {t("results.sortedBy", {
                        ns: "properties",
                        label:
                          filters.sort === "price_low"
                            ? t("filters.sortOptions.priceLow", { ns: "properties" })
                            : filters.sort === "price_high"
                              ? t("filters.sortOptions.priceHigh", { ns: "properties" })
                              : t("filters.sortOptions.areaHigh", { ns: "properties" }),
                      })}
                    </span>
                  )}
                </p>
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                  {paginated.map((p) => {
                    const primaryImg = p.property_images?.find((img) => img.is_primary);
                    const firstImg = p.property_images?.[0];
                    return (
                      <PropertyCard
                        key={p.id}
                        id={p.id}
                        title={p.title}
                        price={Number(p.price)}
                        type={p.type}
                        areaSqft={p.area_sqft ? Number(p.area_sqft) : undefined}
                        areaValue={p.area_value ? Number(p.area_value) : undefined}
                        areaUnit={p.area_unit || undefined}
                        imageUrl={primaryImg?.image_url || firstImg?.image_url}
                        locationName={p.locations?.display_name ?? undefined}
                        propertyPublicId={p.property_public_id}
                      />
                    );
                  })}
                </div>

                <PropertyPagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={(p) => updateFilters({ page: p })}
                />
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Properties;
