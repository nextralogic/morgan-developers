import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { buildPropertyUrl } from "@/lib/property-url";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Building2, Trash2, Lock } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MyProperties = () => {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleDelete = async (propertyId: string) => {
    // Delete images first, then property
    await supabase.from("property_amenities").delete().eq("property_id", propertyId);
    await supabase.from("property_images").delete().eq("property_id", propertyId);
    const { error } = await supabase.from("properties").delete().eq("id", propertyId);
    if (error) {
      toast.error("Failed to delete property.");
      return;
    }
    toast.success("Property deleted.");
    queryClient.invalidateQueries({ queryKey: ["my-properties"] });
  };

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  const { data: properties, isLoading } = useQuery({
    queryKey: ["my-properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*, locations(name), property_images(image_url, is_primary)")
        .eq("created_by", user!.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (authLoading) return null;

  return (
    <>
      <Navbar />
      <main className="container page-padding">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Dashboard</p>
            <h1 className="mt-1 font-heading text-2xl font-bold md:text-3xl">My Properties</h1>
            <p className="mt-2 text-muted-foreground">Manage your property listings.</p>
          </div>
          <Button asChild className="gap-2 rounded-full px-5">
            <Link to="/properties/new"><Plus className="h-4 w-4" /> Post Property</Link>
          </Button>
        </div>

        <div className="mt-10">
          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          ) : !properties || properties.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-20 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground/30" />
              <p className="mt-4 font-heading text-lg font-semibold">No properties yet</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">You haven't posted any properties yet. Get started by creating your first listing.</p>
              <Button asChild className="mt-6 gap-2">
                <Link to="/properties/new"><Plus className="h-4 w-4" /> Post Your First Property</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((p) => {
                const primaryImg = (p.property_images as any[])?.find((img: any) => img.is_primary);
                const firstImg = (p.property_images as any[])?.[0];
                const imgUrl = primaryImg?.image_url || firstImg?.image_url;
                return (
                  <Card key={p.id} className="group overflow-hidden rounded-xl transition-shadow hover:shadow-lg">
                    <Link to={buildPropertyUrl(p.title, (p as any).property_public_id)}>
                      <div className="aspect-[4/3] overflow-hidden bg-muted">
                        {imgUrl ? (
                          <img src={imgUrl} alt={p.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No Image</div>
                        )}
                      </div>
                    </Link>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex gap-1.5 mb-1.5">
                            <Badge variant="secondary" className="capitalize text-xs">{p.type}</Badge>
                            <Badge
                              variant={p.status === "published" ? "default" : p.status === "sold" ? "destructive" : "outline"}
                              className="capitalize text-xs"
                            >
                              {p.status}
                            </Badge>
                          </div>
                          <Link to={buildPropertyUrl(p.title, (p as any).property_public_id)}>
                            <h3 className="font-heading font-semibold truncate hover:text-primary transition-colors">{p.title}</h3>
                          </Link>
                          {(p.locations as any)?.name && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{(p.locations as any).name}</p>
                          )}
                          <p className="mt-2 font-heading font-bold text-primary">
                            NPR {Number(p.price).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          {(isAdmin || p.status === "draft") ? (
                            <Button asChild size="icon" variant="ghost" className="rounded-full">
                              <Link to={`/properties/${p.id}/edit`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                          ) : (
                            <Button size="icon" variant="ghost" className="rounded-full" disabled title="Only draft properties can be edited">
                              <Lock className="h-4 w-4" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="rounded-full text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete property?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{p.title}" and all its images. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDelete(p.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default MyProperties;
