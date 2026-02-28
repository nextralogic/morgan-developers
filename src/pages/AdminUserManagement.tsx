import { useState, useCallback } from "react";
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
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [saving, setSaving] = useState(false);
  const [superAdminWarning, setSuperAdminWarning] = useState(false);

  // Fetch all profiles + their roles
  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-users", page, roleFilter],
    queryFn: async () => {
      // Fetch profiles
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: profiles, error, count } = await supabase
        .from("profiles")
        .select("id, full_name, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Fetch roles for these users
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

      // Client-side role filter
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

    // Check if adding super_admin and warn first
    if (selectedRoles.includes("super_admin") && !editingUser.roles.includes("super_admin") && !superAdminWarning) {
      setSuperAdminWarning(true);
      return;
    }

    setSaving(true);
    try {
      const toAdd = selectedRoles.filter((r) => !editingUser.roles.includes(r));
      const toRemove = editingUser.roles.filter((r) => !selectedRoles.includes(r));

      // Safety: don't allow removing last super_admin
      if (toRemove.includes("super_admin")) {
        const { data: superAdmins } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "super_admin");
        if ((superAdmins?.length ?? 0) <= 1) {
          toast.error("Cannot remove the last super admin.");
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

      // Audit log
      if (toAdd.length > 0 || toRemove.length > 0) {
        logAction("user", editingUser.id, "role_change", {
          previous_roles: editingUser.roles,
          new_roles: selectedRoles,
          added: toAdd,
          removed: toRemove,
        });
      }

      toast.success("Roles updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingUser(null);
      setSuperAdminWarning(false);
    } catch (err) {
      toast.error("Failed to update roles.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-heading text-2xl font-bold">User Management</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage user roles and permissions. Only super admins can modify roles.
        </p>
      </div>

      {/* Filter */}
      <div className="mb-6 flex items-center gap-3">
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ALL_ROLES.map((r) => (
              <SelectItem key={r} value={r} className="capitalize">{r.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {roleFilter !== "all" && (
          <Button variant="ghost" size="sm" onClick={() => setRoleFilter("all")}>Clear</Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="hidden md:table-cell">Joined</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
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
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.full_name || "Unnamed User"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {u.id.slice(0, 8)}…
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 ? (
                        <span className="text-xs text-muted-foreground">No roles</span>
                      ) : (
                        u.roles.map((r) => (
                          <Badge
                            key={r}
                            className={`gap-1 text-[10px] capitalize ${ROLE_COLORS[r] ?? ""}`}
                            variant="outline"
                          >
                            {ROLE_ICONS[r]}
                            {r.replace("_", " ")}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => openRoleEditor(u)}>
                      Edit Roles
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PropertyPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Edit roles dialog */}
      <Dialog open={!!editingUser && !superAdminWarning} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Roles — {editingUser?.full_name || "Unnamed User"}</DialogTitle>
            <DialogDescription>
              Select the roles for this user. Changes take effect immediately.
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
                <Label htmlFor={`role-${role}`} className="flex items-center gap-2 capitalize cursor-pointer">
                  {ROLE_ICONS[role]}
                  {role.replace("_", " ")}
                </Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={saveRoles} disabled={saving}>
              {saving ? "Saving..." : "Save Roles"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Super admin promotion warning */}
      <AlertDialog open={superAdminWarning} onOpenChange={(open) => !open && setSuperAdminWarning(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote to Super Admin?</AlertDialogTitle>
            <AlertDialogDescription>
              This will grant "{editingUser?.full_name || "this user"}" full control over all roles,
              users, and system settings. This is the highest privilege level. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSuperAdminWarning(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={saveRoles}>
              Confirm Promotion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUserManagement;
