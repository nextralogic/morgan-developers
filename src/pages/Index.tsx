import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSearchForm from "@/components/HeroSearchForm";
import PropertyCard from "@/components/PropertyCard";
import { ArrowRight, TrendingUp } from "lucide-react";
import heroBg from "@/assets/hero-bg.webp";
import { getMostViewedProperties } from "@/services/analyticsService";
import { usePageMeta } from "@/lib/seo/usePageMeta";
import { SITE_URL } from "@/lib/seo/constants";

const Index = () => {
  usePageMeta({
    title: "Premium Real Estate in Nepal",
    description: "Find premium apartments, houses, and land in Nepal with Morgan Developers. Curated property listings for discerning buyers.",
    canonicalUrl: `${SITE_URL}/`,
    ogType: "website",
  });

  const { data: featured, isLoading } = useQuery({
    queryKey: ["featured-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*, locations(name), property_images(image_url, is_primary)")
        .eq("status", "published")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  const { data: mostViewed } = useQuery({
    queryKey: ["most-viewed-properties"],
    queryFn: () => getMostViewedProperties(6),
  });

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative flex min-h-[75vh] items-center sm:min-h-[85vh]">
          <img
            src={heroBg}
            alt="Kathmandu Valley with Himalayan mountains"
            className="absolute inset-0 h-full w-full object-cover"
            fetchPriority="high"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/70 via-foreground/50 to-foreground/80" />

          <div className="container relative z-10 py-16 sm:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-widest text-primary-foreground/60 sm:text-sm">
                Morgan Developers
              </p>
              <h1 className="mt-3 font-heading text-3xl font-bold leading-[1.1] text-primary-foreground sm:text-4xl md:text-5xl lg:text-6xl">
                Find Your Dream
                <br />
                Property in Nepal
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-primary-foreground/75 sm:mt-5 sm:text-base md:text-lg">
                Premium apartments, houses, and land — curated for discerning buyers across Kathmandu Valley and beyond.
              </p>
            </div>

            <div className="mt-8 max-w-4xl sm:mt-12">
              <HeroSearchForm />
            </div>
          </div>
        </section>

        {/* Featured Listings */}
        <section className="section-padding bg-background">
          <div className="container">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">Featured</p>
                <h2 className="mt-1 font-heading">Featured Properties</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
                  Handpicked listings from the most sought-after locations.
                </p>
              </div>
              <Button asChild variant="ghost" className="hidden gap-1.5 sm:inline-flex">
                <Link to="/properties">
                  View All <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-8 grid gap-5 grid-cols-1 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                  ))
                : featured?.map((p) => {
                    const primaryImg = (p.property_images as any[])?.find((img: any) => img.is_primary);
                    const firstImg = (p.property_images as any[])?.[0];
                    return (
                      <PropertyCard
                        key={p.id}
                        id={p.id}
                        title={p.title}
                        price={Number(p.price)}
                        type={p.type}
                        areaSqft={p.area_sqft ? Number(p.area_sqft) : undefined}
                        imageUrl={primaryImg?.image_url || firstImg?.image_url}
                        locationName={(p.locations as any)?.name}
                        propertyPublicId={(p as any).property_public_id}
                      />
                    );
                  })}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Button asChild variant="outline" className="gap-2">
                <Link to="/properties">
                  View All Properties <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Most Viewed */}
        {mostViewed && mostViewed.length > 0 && mostViewed.some(p => p.view_count > 0) && (
          <section className="section-padding bg-muted/30">
            <div className="container">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" /> Popular
                  </p>
                  <h2 className="mt-1 font-heading">Most Viewed Properties</h2>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
                    Properties attracting the most attention right now.
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-5 grid-cols-1 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                {mostViewed.filter(p => p.view_count > 0).map((p) => {
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
                      imageUrl={primaryImg?.image_url || firstImg?.image_url}
                      locationName={(p.locations as any)?.name}
                      propertyPublicId={p.property_public_id}
                    />
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
};

export default Index;
