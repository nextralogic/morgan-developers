import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logAction } from "@/services/auditService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PropertyPagination from "@/components/PropertyPagination";
import { toast } from "sonner";
import { Shield, ShieldAlert, ShieldCheck, User } from "lucide-react";
import type { AppRole } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

const ALL_ROLES: AppRole[] = ["super_admin", "admin", "moderator", "buyer"];

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  moderator: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  buyer: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  super_admin: <ShieldAlert className="h-3 w-3" />,
  admin: <ShieldCheck className="h-3 w-3" />,
  moderator: <Shield className="h-3 w-3" />,
  buyer: <User className="h-3 w-3" />,
};

interface UserWithRoles {
  id: string;
  full_name: string | null;
  created_at: string;
  roles: AppRole[];
}

interface Props {
  enabled: boolean;
}

const PAGE_SIZE = 20;

const AdminUserManagement = ({ enabled }: Props) => {
  const { t, i18n } = useTranslation("admin");
  const numberLocale = i18n.resolvedLanguage?.startsWith("ne") ? "ne-NP" : "en-US";
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [saving, setSaving] = useState(false);
  const [superAdminWarning, setSuperAdminWarning] = useState(false);

  const roleLabels: Record<AppRole, string> = {
    super_admin: t("users.roles.super_admin"),
    admin: t("users.roles.admin"),
    moderator: t("users.roles.moderator"),
    buyer: t("users.roles.buyer"),
  };

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-users", page, roleFilter],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: profiles, error, count } = await supabase
        .from("profiles")
        .select("id, full_name, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const userIds = (profiles ?? []).map((p) => p.id);
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const roleMap = new Map<string, AppRole[]>();
      (rolesData ?? []).forEach((r) => {
        const existing = roleMap.get(r.user_id) ?? [];
        existing.push(r.role as AppRole);
        roleMap.set(r.user_id, existing);
      });

      let users: UserWithRoles[] = (profiles ?? []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        created_at: p.created_at,
        roles: roleMap.get(p.id) ?? [],
      }));

      if (roleFilter !== "all") {
        users = users.filter((u) => u.roles.includes(roleFilter as AppRole));
      }

      return {
        users,
        totalCount: roleFilter === "all" ? (count ?? 0) : users.length,
      };
    },
    enabled,
  });

  const users = result?.users ?? [];
  const totalPages = Math.ceil((result?.totalCount ?? 0) / PAGE_SIZE);

  const openRoleEditor = (user: UserWithRoles) => {
    setEditingUser(user);
    setSelectedRoles([...user.roles]);
  };

  const toggleRole = (role: AppRole) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const saveRoles = async () => {
    if (!editingUser) return;

    if (selectedRoles.includes("super_admin") && !editingUser.roles.includes("super_admin") && !superAdminWarning) {
      setSuperAdminWarning(true);
      return;
    }

    setSaving(true);
    try {
      const toAdd = selectedRoles.filter((r) => !editingUser.roles.includes(r));
      const toRemove = editingUser.roles.filter((r) => !selectedRoles.includes(r));

      if (toRemove.includes("super_admin")) {
        const { data: superAdmins } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "super_admin");
        if ((superAdmins?.length ?? 0) <= 1) {
          toast.error(t("users.toasts.cannotRemoveLastSuperAdmin"));
          setSaving(false);
          return;
        }
      }

      for (const role of toRemove) {
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", editingUser.id)
          .eq("role", role as any);
      }

      for (const role of toAdd) {
        await supabase
          .from("user_roles")
          .insert({ user_id: editingUser.id, role: role as any });
      }

      if (toAdd.length > 0 || toRemove.length > 0) {
        logAction("user", editingUser.id, "role_change", {
          previous_roles: editingUser.roles,
          new_roles: selectedRoles,
          added: toAdd,
          removed: toRemove,
        });
      }

      toast.success(t("users.toasts.rolesUpdated"));
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingUser(null);
      setSuperAdminWarning(false);
    } catch {
      toast.error(t("users.toasts.rolesUpdateFailed"));
    } finally {
      setSaving(false);
    }
  };

  const editingUserName = editingUser?.full_name || t("users.table.unnamedUser");

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-heading text-2xl font-bold">{t("users.header.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("users.header.description")}
        </p>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <Select value={roleFilter} onValueChange={(value) => { setRoleFilter(value); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("users.filter.allRoles")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("users.filter.allRoles")}</SelectItem>
            {ALL_ROLES.map((role) => (
              <SelectItem key={role} value={role}>{roleLabels[role]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {roleFilter !== "all" && (
          <Button variant="ghost" size="sm" onClick={() => setRoleFilter("all")}>
            {t("users.filter.clear")}
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("users.table.name")}</TableHead>
              <TableHead>{t("users.table.userId")}</TableHead>
              <TableHead>{t("users.table.roles")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("users.table.joined")}</TableHead>
              <TableHead className="w-[100px]">{t("users.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && users.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 w-full animate-pulse rounded bg-muted" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  {t("users.table.noUsers")}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.full_name || t("users.table.unnamedUser")}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {user.id.slice(0, 8)}…
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length === 0 ? (
                        <span className="text-xs text-muted-foreground">{t("users.table.noRoles")}</span>
                      ) : (
                        user.roles.map((role) => (
                          <Badge
                            key={role}
                            className={`gap-1 text-[10px] ${ROLE_COLORS[role] ?? ""}`}
                            variant="outline"
                          >
                            {ROLE_ICONS[role]}
                            {roleLabels[role]}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    {new Date(user.created_at).toLocaleDateString(numberLocale)}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => openRoleEditor(user)}>
                      {t("users.table.editRoles")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PropertyPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Dialog open={!!editingUser && !superAdminWarning} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.dialog.editTitle", { name: editingUserName })}</DialogTitle>
            <DialogDescription>
              {t("users.dialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {ALL_ROLES.map((role) => (
              <div key={role} className="flex items-center gap-3">
                <Checkbox
                  id={`role-${role}`}
                  checked={selectedRoles.includes(role)}
                  onCheckedChange={() => toggleRole(role)}
                />
                <Label htmlFor={`role-${role}`} className="flex cursor-pointer items-center gap-2">
                  {ROLE_ICONS[role]}
                  {roleLabels[role]}
                </Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>{t("users.dialog.cancel")}</Button>
            <Button onClick={saveRoles} disabled={saving}>
              {saving ? t("users.dialog.saving") : t("users.dialog.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={superAdminWarning} onOpenChange={(open) => !open && setSuperAdminWarning(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("users.warning.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("users.warning.description", { name: editingUserName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSuperAdminWarning(false)}>{t("users.warning.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={saveRoles}>
              {t("users.warning.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUserManagement;
