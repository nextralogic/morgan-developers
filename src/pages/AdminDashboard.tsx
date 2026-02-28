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

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  published: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  sold: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isModerator, isAdmin, isSuperAdmin } = useAuth();
  const [checking, setChecking] = useState(true);

  const [filters, setFilters] = useState<AdminPropertyFilters>({ page: 1, pageSize: 20, isDeleted: false });
  const [searchInput, setSearchInput] = useState("");
  const [soldConfirm, setSoldConfirm] = useState<{ id: string; title: string } | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin/login"); return; }
      // Check for any admin-level role (moderator, admin, super_admin)
      const { data: roles } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", user.id);
      const hasAccess = (roles ?? []).some((r) =>
        ["super_admin", "admin", "moderator"].includes(r.role)
      );
      if (!hasAccess) { toast.error("Access denied."); navigate("/admin/login"); return; }
      setChecking(false);
    };
    check();
  }, [navigate]);

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
      toast.success(`Status updated to ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const handleArchive = async (propertyId: string) => {
    try {
      await archiveProperty(propertyId);
      toast.success("Property archived.");
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
    } catch {
      toast.error("Failed to archive property.");
    }
  };

  const handleRestore = async (propertyId: string) => {
    try {
      await restoreProperty(propertyId);
      toast.success("Property restored.");
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
    } catch {
      toast.error("Failed to restore property.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Checking access...</p>
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
            <h1 className="font-heading text-lg font-bold">Admin Dashboard</h1>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="container py-8">
        <TopViewedWidget enabled={!checking} />

        <Tabs defaultValue="properties" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="properties" className="gap-2">
              <LayoutDashboard className="h-4 w-4" /> Properties
            </TabsTrigger>
            <TabsTrigger value="leads" className="gap-2">
              <Users className="h-4 w-4" /> Leads
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <ScrollText className="h-4 w-4" /> Audit Logs
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="users" className="gap-2">
                <ShieldCheck className="h-4 w-4" /> Users
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="properties">
        <div className="mb-6">
          <h2 className="font-heading text-2xl font-bold">Property Management</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {result?.totalCount ?? 0} properties total
          </p>
        </div>

        {/* Filters row */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title or ID..."
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleSearch}>Search</Button>

          <Select
            value={filters.status ?? "all"}
            onValueChange={(v) => updateFilters({ status: v === "all" ? undefined : v as any })}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.type ?? "all"}
            onValueChange={(v) => updateFilters({ type: v === "all" ? undefined : v as any })}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="land">Land</SelectItem>
              <SelectItem value="house">House</SelectItem>
              <SelectItem value="apartment">Apartment</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.isDeleted === undefined ? "all" : filters.isDeleted ? "deleted" : "active"}
            onValueChange={(v) => updateFilters({ isDeleted: v === "all" ? undefined : v === "deleted" })}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Active" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="deleted">Archived</SelectItem>
            </SelectContent>
          </Select>

          {(filters.query || filters.status || filters.type || filters.isDeleted !== false) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchInput(""); setFilters({ page: 1, pageSize: 20, isDeleted: false }); }}>
              Clear
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead className="w-[130px]">Price</TableHead>
                <TableHead className="w-[110px]">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Location</TableHead>
                <TableHead className="hidden md:table-cell">Created By</TableHead>
                <TableHead className="hidden md:table-cell w-[110px]">Date</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
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
                    No properties found.
                  </TableCell>
                </TableRow>
              ) : (
                properties.map((p) => (
                  <TableRow key={p.id} className={p.is_deleted ? "opacity-60" : ""}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.property_public_id}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {p.title}
                      {p.is_deleted && (
                        <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0">Archived</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize text-xs">{p.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      NPR {Number(p.price).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize cursor-pointer ${STATUS_COLORS[p.status] ?? ""}`}>
                            {p.status}
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
                              className="capitalize"
                            >
                              {s}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground truncate max-w-[150px]">
                      {p.locations?.display_name ?? "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground truncate max-w-[120px]">
                      {p.created_by ? p.created_by.slice(0, 8) + "…" : "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
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
                              <ExternalLink className="h-3.5 w-3.5" /> View
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/properties/${p.id}/edit`} className="flex items-center gap-2">
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {isAdmin && (p.is_deleted ? (
                            <DropdownMenuItem onClick={() => handleRestore(p.id)} className="flex items-center gap-2">
                              <RotateCcw className="h-3.5 w-3.5" /> Restore
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => setArchiveConfirm({ id: p.id, title: p.title })}
                              className="flex items-center gap-2 text-destructive focus:text-destructive"
                            >
                              <Archive className="h-3.5 w-3.5" /> Archive
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
          onPageChange={(p) => updateFilters({ page: p })}
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

      {/* Sold confirmation */}
      <AlertDialog open={!!soldConfirm} onOpenChange={(open) => !open && setSoldConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Sold?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark "{soldConfirm?.title}" as sold and remove it from public listings. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (soldConfirm) handleStatusChange(soldConfirm.id, "sold");
              setSoldConfirm(null);
            }}>
              Mark as Sold
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive confirmation */}
      <AlertDialog open={!!archiveConfirm} onOpenChange={(open) => !open && setArchiveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this property?</AlertDialogTitle>
            <AlertDialogDescription>
              "{archiveConfirm?.title}" will no longer appear on the site but can be restored by an admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (archiveConfirm) handleArchive(archiveConfirm.id);
                setArchiveConfirm(null);
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;

/** Small widget showing top viewed properties */
function TopViewedWidget({ enabled }: { enabled: boolean }) {
  const { data: topViewed } = useQuery({
    queryKey: ["admin-top-viewed"],
    queryFn: () => getAdminTopViewed(10),
    enabled,
  });

  if (!topViewed || topViewed.length === 0 || !topViewed.some(p => p.view_count > 0)) return null;

  return (
    <div className="mb-8 rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="font-heading text-lg font-semibold">Top Viewed Properties</h3>
      </div>
      <div className="grid gap-2">
        {topViewed.filter(p => p.view_count > 0).slice(0, 5).map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors">
            <span className="text-xs font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{p.title}</p>
              <p className="text-xs text-muted-foreground">
                #{p.property_public_id} · <span className="capitalize">{p.type}</span> · <span className="capitalize">{p.status}</span>
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm font-mono text-muted-foreground">
              <Eye className="h-3.5 w-3.5" />
              {p.view_count.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
