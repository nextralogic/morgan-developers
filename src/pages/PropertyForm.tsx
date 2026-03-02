import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ImageUploadQueue from "@/components/ImageUploadQueue";
import NepalAddressSelect from "@/components/NepalAddressSelect";
import { upsertLocation, getLocationById } from "@/services/locationService";
import type { NepalAddress } from "@/utils/nepalAddress";
import { AREA_UNITS, convertToSqft, type AreaUnit } from "@/lib/area-utils";
import { useTranslation } from "react-i18next";

const EMPTY_ADDRESS: NepalAddress = { province: "", district: "", municipality_or_city: "", ward: null, area_name: "" };

const PropertyForm = () => {
  const { t, i18n } = useTranslation(["owner", "common"]);
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const numberLocale = i18n.resolvedLanguage?.startsWith("ne") ? "ne-NP" : "en-US";

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    price: "",
    type: "house" as "apartment" | "house" | "land",
    status: "draft" as "draft" | "published" | "sold",
    description: "",
    area_value: "",
    area_unit: "sq_feet" as AreaUnit,
  });
  const [address, setAddress] = useState<NepalAddress>({ ...EMPTY_ADDRESS });
  const [images, setImages] = useState<{ image_url: string; is_primary: boolean; id?: string }[]>([]);

  // Fetch existing property for edit
  const { data: existingProperty } = useQuery({
    queryKey: ["edit-property", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*, property_images(*)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  // Prefill form from existing property
  useEffect(() => {
    if (existingProperty) {
      setForm({
        title: existingProperty.title,
        price: String(existingProperty.price),
        type: existingProperty.type as any,
        status: existingProperty.status as any,
        description: existingProperty.description || "",
        area_value: existingProperty.area_value ? String(existingProperty.area_value) : (existingProperty.area_sqft ? String(existingProperty.area_sqft) : ""),
        area_unit: ((existingProperty as any).area_unit || "sq_feet") as AreaUnit,
      });
      setImages(
        ((existingProperty.property_images as any[]) || []).map((img: any) => ({
          image_url: img.image_url,
          is_primary: img.is_primary,
          id: img.id,
        }))
      );
      if (existingProperty.location_id) {
        getLocationById(existingProperty.location_id).then((loc) => {
          if (loc) {
            setAddress({
              province: loc.province || "",
              district: loc.district || "",
              municipality_or_city: loc.municipality_or_city || "",
              ward: loc.ward,
              area_name: loc.area_name || "",
            });
          }
        });
      }
    }
  }, [existingProperty]);

  // Access control
  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
    if (isEdit && existingProperty && !isAdmin) {
      // Non-admin: can only edit own draft properties
      if (existingProperty.created_by !== user?.id) {
        toast.error(t("propertyForm.toasts.onlyOwn", { ns: "owner" }));
        navigate("/my-properties");
      } else if (existingProperty.status !== "draft") {
        toast.error(t("propertyForm.toasts.draftOnly", { ns: "owner" }));
        navigate("/my-properties");
      }
    }
  }, [authLoading, user, existingProperty, isEdit, isAdmin, navigate, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title.trim()) { toast.error(t("propertyForm.toasts.titleRequired", { ns: "owner" })); return; }

    // Enforce draft-only for non-admins
    const statusToSave = isAdmin ? form.status : "draft";

    if (statusToSave === "published" && (!address.province || !address.district || !address.municipality_or_city)) {
      toast.error(t("propertyForm.toasts.publishLocationRequired", { ns: "owner" }));
      return;
    }

    setSaving(true);

    let locationId: string | null = null;
    if (address.province && address.district && address.municipality_or_city) {
      try {
        locationId = await upsertLocation(address);
      } catch {
        toast.error(t("propertyForm.toasts.saveLocationFailed", { ns: "owner" }));
        setSaving(false);
        return;
      }
    }

    const areaValue = form.area_value ? Number(form.area_value) : null;
    const areaSqft = areaValue != null ? convertToSqft(areaValue, form.area_unit) : null;

    const propertyData: Record<string, unknown> = {
      title: form.title,
      price: Number(form.price) || 0,
      type: form.type as any,
      status: statusToSave as any,
      description: form.description || null,
      area_sqft: areaSqft,
      area_value: areaValue,
      area_unit: form.area_unit,
      location_id: locationId,
    };

    // Only set created_by on new properties — admin edits must not transfer ownership
    if (!isEdit) {
      propertyData.created_by = user.id;
    }

    let propertyId = id;

    if (isEdit) {
      const { error } = await supabase.from("properties").update(propertyData as any).eq("id", id!);
      if (error) { toast.error(t("propertyForm.toasts.updateFailed", { ns: "owner" })); setSaving(false); return; }
      await supabase.from("property_images").delete().eq("property_id", id!);
    } else {
      const { data, error } = await supabase.from("properties").insert(propertyData as any).select("id, property_public_id").single();
      if (error) { toast.error(t("propertyForm.toasts.createFailed", { ns: "owner" })); setSaving(false); return; }
      propertyId = data.id;
    }

    if (images.length > 0 && propertyId) {
      const imgRows = images.map((img, i) => ({
        property_id: propertyId!,
        image_url: img.image_url,
        is_primary: img.is_primary,
        display_order: i,
      }));
      await supabase.from("property_images").insert(imgRows);
    }

    setSaving(false);
    toast.success(isEdit ? t("propertyForm.toasts.updated", { ns: "owner" }) : t("propertyForm.toasts.created", { ns: "owner" }));
    navigate("/my-properties");
  };

  if (authLoading) return null;

  const canEditStatus = isAdmin;
  const typeLabels: Record<"land" | "house" | "apartment", string> = {
    land: t("property.types.land", { ns: "common" }),
    house: t("property.types.house", { ns: "common" }),
    apartment: t("property.types.apartment", { ns: "common" }),
  };
  const statusLabels: Record<"draft" | "published" | "sold", string> = {
    draft: t("property.statuses.draft", { ns: "common" }),
    published: t("property.statuses.published", { ns: "common" }),
    sold: t("property.statuses.sold", { ns: "common" }),
  };
  const areaUnitKeys = Object.keys(AREA_UNITS) as AreaUnit[];

  return (
    <>
      <Navbar />
      <main className="container max-w-2xl page-padding">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {isEdit ? t("propertyForm.header.editEyebrow", { ns: "owner" }) : t("propertyForm.header.newEyebrow", { ns: "owner" })}
          </p>
          <h1 className="mt-1 font-heading text-2xl font-bold md:text-3xl">
            {isEdit ? t("propertyForm.header.editTitle", { ns: "owner" }) : t("propertyForm.header.newTitle", { ns: "owner" })}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isEdit ? t("propertyForm.header.editDescription", { ns: "owner" }) : t("propertyForm.header.newDescription", { ns: "owner" })}
          </p>
        </div>

        <Card className="rounded-xl">
          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <Label htmlFor="title">{t("propertyForm.fields.title", { ns: "owner" })}</Label>
                <Input
                  id="title"
                  className="mt-1.5"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={t("propertyForm.fields.titlePlaceholder", { ns: "owner" })}
                />
              </div>

              {/* Price */}
              <div>
                <Label htmlFor="price">{t("propertyForm.fields.price", { ns: "owner" })}</Label>
                <Input
                  id="price"
                  className="mt-1.5"
                  type="number"
                  min="0"
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder={t("propertyForm.fields.pricePlaceholder", { ns: "owner" })}
                />
              </div>

              {/* Area Unit + Value */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label>{t("propertyForm.fields.areaUnit", { ns: "owner" })}</Label>
                  <Select value={form.area_unit} onValueChange={(v) => setForm({ ...form, area_unit: v as AreaUnit })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {areaUnitKeys.map((key) => (
                        <SelectItem key={key} value={key}>
                          {t(`areaUnits.${key}` as const, { ns: "common" })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="area">{t("propertyForm.fields.areaValue", { ns: "owner" })}</Label>
                  <Input
                    id="area"
                    className="mt-1.5"
                    type="number"
                    min="0"
                    step="any"
                    value={form.area_value}
                    onChange={(e) => setForm({ ...form, area_value: e.target.value })}
                    placeholder={t("propertyForm.fields.areaValuePlaceholder", { ns: "owner" })}
                  />
                </div>
              </div>
              {form.area_value && (
                <p className="text-sm text-muted-foreground -mt-3">
                  {t("propertyForm.fields.areaApprox", {
                    ns: "owner",
                    value: (convertToSqft(Number(form.area_value), form.area_unit) ?? 0).toLocaleString(numberLocale),
                  })}
                </p>
              )}

              {/* Type + Status */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label>{t("propertyForm.fields.type", { ns: "owner" })}</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="land">{typeLabels.land}</SelectItem>
                      <SelectItem value="house">{typeLabels.house}</SelectItem>
                      <SelectItem value="apartment">{typeLabels.apartment}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("propertyForm.fields.status", { ns: "owner" })}</Label>
                  {canEditStatus ? (
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">{statusLabels.draft}</SelectItem>
                        <SelectItem value="published">{statusLabels.published}</SelectItem>
                        <SelectItem value="sold">{statusLabels.sold}</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-1.5 flex h-10 items-center gap-2 rounded-md border bg-muted/50 px-3">
                      <Badge variant="outline" className="capitalize">{statusLabels[form.status]}</Badge>
                      <span className="text-xs text-muted-foreground">{t("propertyForm.fields.onlyAdminStatus", { ns: "owner" })}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Nepal Address */}
              <div className="rounded-xl border bg-muted/30 p-5">
                <h3 className="mb-4 text-sm font-semibold">{t("propertyForm.fields.location", { ns: "owner" })}</h3>
                <NepalAddressSelect value={address} onChange={setAddress} />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="desc">{t("propertyForm.fields.description", { ns: "owner" })}</Label>
                <Textarea
                  id="desc"
                  className="mt-1.5"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t("propertyForm.fields.descriptionPlaceholder", { ns: "owner" })}
                />
              </div>

              {/* Images */}
              <div>
                <Label>{t("propertyForm.fields.images", { ns: "owner" })}</Label>
                <div className="mt-2">
                  {user && (
                    <ImageUploadQueue
                      userId={user.id}
                      images={images}
                      onImagesChange={setImages}
                    />
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 border-t pt-6">
                <Button type="submit" disabled={saving} className="px-8">
                  {saving
                    ? t("propertyForm.actions.saving", { ns: "owner" })
                    : isEdit
                      ? t("propertyForm.actions.updateProperty", { ns: "owner" })
                      : t("propertyForm.actions.createProperty", { ns: "owner" })}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/my-properties")}>
                  {t("propertyForm.actions.cancel", { ns: "owner" })}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
};

export default PropertyForm;
