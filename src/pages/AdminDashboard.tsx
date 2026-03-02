import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAdminProperties, updatePropertyStatus, archiveProperty, restoreProperty, type AdminPropertyFilters } from "@/services/adminPropertyService";
import { getAdminTopViewed } from "@/services/analyticsService";
import { buildPropertyUrl } from "@/lib/property-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PropertyPagination from "@/components/PropertyPagination";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, LayoutDashboard, Search, ExternalLink, Pencil, MoreHorizontal, ChevronDown, TrendingUp, Eye, Archive, RotateCcw, Users, ScrollText, ShieldCheck } from "lucide-react";
import AdminLeads from "@/pages/AdminLeads";
import AdminAuditLogs from "@/pages/AdminAuditLogs";
import AdminUserManagement from "@/pages/AdminUserManagement";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  published: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  sold: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const AdminDashboard = () => {
  const { t, i18n } = useTranslation(["admin", "common"]);
  const numberLocale = i18n.resolvedLanguage?.startsWith("ne") ? "ne-NP" : "en-US";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, isSuperAdmin } = useAuth();
  const [checking, setChecking] = useState(true);

  const [filters, setFilters] = useState<AdminPropertyFilters>({ page: 1, pageSize: 20, isDeleted: false });
  const [searchInput, setSearchInput] = useState("");
  const [soldConfirm, setSoldConfirm] = useState<{ id: string; title: string } | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<{ id: string; title: string } | null>(null);

  const propertyStatusLabels: Record<"draft" | "published" | "sold", string> = {
    draft: t("propertyStatuses.draft", { ns: "admin" }),
    published: t("propertyStatuses.published", { ns: "admin" }),
    sold: t("propertyStatuses.sold", { ns: "admin" }),
  };
  const propertyTypeLabels: Record<"land" | "house" | "apartment", string> = {
    land: t("propertyTypes.land", { ns: "admin" }),
    house: t("propertyTypes.house", { ns: "admin" }),
    apartment: t("propertyTypes.apartment", { ns: "admin" }),
  };

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin/login"); return; }
      const { data: roles } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", user.id);
      const hasAccess = (roles ?? []).some((r) =>
        ["super_admin", "admin", "moderator"].includes(r.role)
      );
      if (!hasAccess) { toast.error(t("dashboard.toasts.accessDenied", { ns: "admin" })); navigate("/admin/login"); return; }
      setChecking(false);
    };
    check();
  }, [navigate, t]);

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-properties", filters],
    queryFn: () => fetchAdminProperties(filters),
    enabled: !checking,
    placeholderData: (prev) => prev,
  });

  const updateFilters = useCallback((patch: Partial<AdminPropertyFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  }, []);

  const handleSearch = () => {
    updateFilters({ query: searchInput || undefined });
  };

  const handleStatusChange = async (propertyId: string, newStatus: "draft" | "published" | "sold") => {
    try {
      await updatePropertyStatus(propertyId, newStatus);
      toast.success(t("dashboard.toasts.statusUpdated", {
        ns: "admin",
        status: propertyStatusLabels[newStatus],
      }));
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
    } catch {
      toast.error(t("dashboard.toasts.statusUpdateFailed", { ns: "admin" }));
    }
  };

  const handleArchive = async (propertyId: string) => {
    try {
      await archiveProperty(propertyId);
      toast.success(t("dashboard.toasts.propertyArchived", { ns: "admin" }));
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
    } catch {
      toast.error(t("dashboard.toasts.archiveFailed", { ns: "admin" }));
    }
  };

  const handleRestore = async (propertyId: string) => {
    try {
      await restoreProperty(propertyId);
      toast.success(t("dashboard.toasts.propertyRestored", { ns: "admin" }));
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
    } catch {
      toast.error(t("dashboard.toasts.restoreFailed", { ns: "admin" }));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{t("dashboard.checkingAccess", { ns: "admin" })}</p>
      </div>
    );
  }

  const properties = result?.data ?? [];
  const totalPages = Math.ceil((result?.totalCount ?? 0) / (result?.pageSize ?? 20));
  const page = result?.page ?? 1;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <LayoutDashboard className="h-4 w-4 text-primary" />
            </div>
            <h1 className="font-heading text-lg font-bold">{t("dashboard.header.title", { ns: "admin" })}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher className="shrink-0" />
            <Button variant="outline" size="sm" className="gap-2" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> {t("dashboard.header.signOut", { ns: "admin" })}
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <TopViewedWidget enabled={!checking} />

        <Tabs defaultValue="properties" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="properties" className="gap-2">
              <LayoutDashboard className="h-4 w-4" /> {t("dashboard.tabs.properties", { ns: "admin" })}
            </TabsTrigger>
            <TabsTrigger value="leads" className="gap-2">
              <Users className="h-4 w-4" /> {t("dashboard.tabs.leads", { ns: "admin" })}
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <ScrollText className="h-4 w-4" /> {t("dashboard.tabs.audit", { ns: "admin" })}
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="users" className="gap-2">
                <ShieldCheck className="h-4 w-4" /> {t("dashboard.tabs.users", { ns: "admin" })}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="properties">
            <div className="mb-6">
              <h2 className="font-heading text-2xl font-bold">{t("dashboard.section.title", { ns: "admin" })}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("dashboard.section.total", { ns: "admin", count: result?.totalCount ?? 0 })}
              </p>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("dashboard.filters.searchPlaceholder", { ns: "admin" })}
                  className="pl-9"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleSearch}>
                {t("dashboard.filters.search", { ns: "admin" })}
              </Button>

              <Select
                value={filters.status ?? "all"}
                onValueChange={(v) => updateFilters({ status: v === "all" ? undefined : v as "draft" | "published" | "sold" })}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t("dashboard.filters.allStatuses", { ns: "admin" })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("dashboard.filters.allStatuses", { ns: "admin" })}</SelectItem>
                  <SelectItem value="draft">{propertyStatusLabels.draft}</SelectItem>
                  <SelectItem value="published">{propertyStatusLabels.published}</SelectItem>
                  <SelectItem value="sold">{propertyStatusLabels.sold}</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.type ?? "all"}
                onValueChange={(v) => updateFilters({ type: v === "all" ? undefined : v as "land" | "house" | "apartment" })}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t("dashboard.filters.allTypes", { ns: "admin" })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("dashboard.filters.allTypes", { ns: "admin" })}</SelectItem>
                  <SelectItem value="land">{propertyTypeLabels.land}</SelectItem>
                  <SelectItem value="house">{propertyTypeLabels.house}</SelectItem>
                  <SelectItem value="apartment">{propertyTypeLabels.apartment}</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.isDeleted === undefined ? "all" : filters.isDeleted ? "deleted" : "active"}
                onValueChange={(v) => updateFilters({ isDeleted: v === "all" ? undefined : v === "deleted" })}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t("dashboard.filters.active", { ns: "admin" })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("dashboard.filters.allVisibility", { ns: "admin" })}</SelectItem>
                  <SelectItem value="active">{t("dashboard.filters.active", { ns: "admin" })}</SelectItem>
                  <SelectItem value="deleted">{t("dashboard.filters.archived", { ns: "admin" })}</SelectItem>
                </SelectContent>
              </Select>

              {(filters.query || filters.status || filters.type || filters.isDeleted !== false) && (
                <Button variant="ghost" size="sm" onClick={() => { setSearchInput(""); setFilters({ page: 1, pageSize: 20, isDeleted: false }); }}>
                  {t("dashboard.filters.clear", { ns: "admin" })}
                </Button>
              )}
            </div>

            <div className="rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">{t("dashboard.table.id", { ns: "admin" })}</TableHead>
                    <TableHead>{t("dashboard.table.title", { ns: "admin" })}</TableHead>
                    <TableHead className="w-[100px]">{t("dashboard.table.type", { ns: "admin" })}</TableHead>
                    <TableHead className="w-[130px]">{t("dashboard.table.price", { ns: "admin" })}</TableHead>
                    <TableHead className="w-[110px]">{t("dashboard.table.status", { ns: "admin" })}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("dashboard.table.location", { ns: "admin" })}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("dashboard.table.createdBy", { ns: "admin" })}</TableHead>
                    <TableHead className="hidden md:table-cell w-[110px]">{t("dashboard.table.date", { ns: "admin" })}</TableHead>
                    <TableHead className="w-[80px]">{t("dashboard.table.actions", { ns: "admin" })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && properties.length === 0 ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <TableCell key={j}><div className="h-4 w-full animate-pulse rounded bg-muted" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : properties.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                        {t("dashboard.table.noProperties", { ns: "admin" })}
                      </TableCell>
                    </TableRow>
                  ) : (
                    properties.map((p) => (
                      <TableRow key={p.id} className={p.is_deleted ? "opacity-60" : ""}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{p.property_public_id}</TableCell>
                        <TableCell className="max-w-[200px] truncate font-medium">
                          {p.title}
                          {p.is_deleted && (
                            <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-[10px]">
                              {t("dashboard.table.archivedBadge", { ns: "admin" })}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {propertyTypeLabels[p.type as keyof typeof propertyTypeLabels] ?? p.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {t("currency.npr", { ns: "common", amount: Number(p.price).toLocaleString(numberLocale) })}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[p.status] ?? ""}`}>
                                {propertyStatusLabels[p.status as keyof typeof propertyStatusLabels] ?? p.status}
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {(["draft", "published", "sold"] as const).map((s) => (
                                <DropdownMenuItem
                                  key={s}
                                  disabled={s === p.status}
                                  onClick={() => {
                                    if (s === "sold") {
                                      setSoldConfirm({ id: p.id, title: p.title });
                                    } else {
                                      handleStatusChange(p.id, s);
                                    }
                                  }}
                                >
                                  {propertyStatusLabels[s]}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="hidden max-w-[150px] truncate text-xs text-muted-foreground lg:table-cell">
                          {p.locations?.display_name ?? t("shared.none", { ns: "admin" })}
                        </TableCell>
                        <TableCell className="hidden max-w-[120px] truncate text-xs text-muted-foreground md:table-cell">
                          {p.created_by ? `${p.created_by.slice(0, 8)}…` : t("shared.none", { ns: "admin" })}
                        </TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                          {new Date(p.created_at).toLocaleDateString(numberLocale)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <a
                                  href={buildPropertyUrl(p.title, p.property_public_id)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" /> {t("dashboard.rowActions.view", { ns: "admin" })}
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/properties/${p.id}/edit`} className="flex items-center gap-2">
                                  <Pencil className="h-3.5 w-3.5" /> {t("dashboard.rowActions.edit", { ns: "admin" })}
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {isAdmin && (p.is_deleted ? (
                                <DropdownMenuItem onClick={() => handleRestore(p.id)} className="flex items-center gap-2">
                                  <RotateCcw className="h-3.5 w-3.5" /> {t("dashboard.rowActions.restore", { ns: "admin" })}
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => setArchiveConfirm({ id: p.id, title: p.title })}
                                  className="flex items-center gap-2 text-destructive focus:text-destructive"
                                >
                                  <Archive className="h-3.5 w-3.5" /> {t("dashboard.rowActions.archive", { ns: "admin" })}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <PropertyPagination
              page={page}
              totalPages={totalPages}
              onPageChange={(nextPage) => updateFilters({ page: nextPage })}
            />
          </TabsContent>

          <TabsContent value="leads">
            <AdminLeads enabled={!checking} />
          </TabsContent>

          <TabsContent value="audit">
            <AdminAuditLogs enabled={!checking} />
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="users">
              <AdminUserManagement enabled={!checking} />
            </TabsContent>
          )}
        </Tabs>
      </main>

      <AlertDialog open={!!soldConfirm} onOpenChange={(open) => !open && setSoldConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dashboard.dialogs.soldTitle", { ns: "admin" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dashboard.dialogs.soldDescription", { ns: "admin", title: soldConfirm?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dashboard.dialogs.cancel", { ns: "admin" })}</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (soldConfirm) handleStatusChange(soldConfirm.id, "sold");
              setSoldConfirm(null);
            }}>
              {t("dashboard.dialogs.soldConfirm", { ns: "admin" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!archiveConfirm} onOpenChange={(open) => !open && setArchiveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dashboard.dialogs.archiveTitle", { ns: "admin" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dashboard.dialogs.archiveDescription", { ns: "admin", title: archiveConfirm?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dashboard.dialogs.cancel", { ns: "admin" })}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (archiveConfirm) handleArchive(archiveConfirm.id);
                setArchiveConfirm(null);
              }}
            >
              {t("dashboard.dialogs.archiveConfirm", { ns: "admin" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;

function TopViewedWidget({ enabled }: { enabled: boolean }) {
  const { t, i18n } = useTranslation("admin");
  const numberLocale = i18n.resolvedLanguage?.startsWith("ne") ? "ne-NP" : "en-US";

  const { data: topViewed } = useQuery({
    queryKey: ["admin-top-viewed"],
    queryFn: () => getAdminTopViewed(10),
    enabled,
  });

  if (!topViewed || topViewed.length === 0 || !topViewed.some((p) => p.view_count > 0)) return null;

  const propertyTypeLabels = {
    land: t("propertyTypes.land"),
    house: t("propertyTypes.house"),
    apartment: t("propertyTypes.apartment"),
  } as const;
  const propertyStatusLabels = {
    draft: t("propertyStatuses.draft"),
    published: t("propertyStatuses.published"),
    sold: t("propertyStatuses.sold"),
  } as const;

  return (
    <div className="mb-8 rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="font-heading text-lg font-semibold">{t("dashboard.topViewed.title")}</h3>
      </div>
      <div className="grid gap-2">
        {topViewed.filter((p) => p.view_count > 0).slice(0, 5).map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50">
            <span className="w-5 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{p.title}</p>
              <p className="text-xs text-muted-foreground">
                #{p.property_public_id} · {propertyTypeLabels[p.type as keyof typeof propertyTypeLabels] ?? p.type} · {propertyStatusLabels[p.status as keyof typeof propertyStatusLabels] ?? p.status}
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm font-mono text-muted-foreground">
              <Eye className="h-3.5 w-3.5" />
              {p.view_count.toLocaleString(numberLocale)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
