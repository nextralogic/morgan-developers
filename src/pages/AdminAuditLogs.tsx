import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAuditLogs, type AuditLogFilters } from "@/services/auditService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PropertyPagination from "@/components/PropertyPagination";

const ENTITY_TYPES = ["property", "lead", "user"];
const ACTIONS = ["publish", "unpublish", "archive", "restore", "status_change", "edit", "note_update", "role_change"];

const ACTION_COLORS: Record<string, string> = {
  publish: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  unpublish: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  archive: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  restore: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  status_change: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  edit: "bg-muted text-muted-foreground",
  note_update: "bg-muted text-muted-foreground",
};

interface Props {
  enabled: boolean;
}

const AdminAuditLogs = ({ enabled }: Props) => {
  const [filters, setFilters] = useState<AuditLogFilters>({ page: 1, pageSize: 25 });

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-audit-logs", filters],
    queryFn: () => fetchAuditLogs(filters),
    enabled,
    placeholderData: (prev) => prev,
  });

  const updateFilters = useCallback((patch: Partial<AuditLogFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  }, []);

  const logs = result?.data ?? [];
  const totalPages = Math.ceil((result?.totalCount ?? 0) / (result?.pageSize ?? 25));
  const page = result?.page ?? 1;

  const hasFilters = filters.entity_type || filters.action;

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-heading text-2xl font-bold">Audit Logs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {result?.totalCount ?? 0} log entries
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Select
          value={filters.entity_type ?? "all"}
          onValueChange={(v) => updateFilters({ entity_type: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.action ?? "all"}
          onValueChange={(v) => updateFilters({ action: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {ACTIONS.map((a) => (
              <SelectItem key={a} value={a} className="capitalize">{a.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({ page: 1, pageSize: 25 })}>
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">Date</TableHead>
              <TableHead className="w-[100px]">Entity</TableHead>
              <TableHead className="w-[130px]">Action</TableHead>
              <TableHead className="hidden md:table-cell">Entity ID</TableHead>
              <TableHead className="hidden lg:table-cell">Details</TableHead>
              <TableHead className="hidden md:table-cell w-[120px]">Performed By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && logs.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 w-full animate-pulse rounded bg-muted" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No audit logs found.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.performed_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">{log.entity_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${ACTION_COLORS[log.action] ?? "bg-muted text-muted-foreground"}`}>
                      {log.action.replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground truncate max-w-[120px]">
                    {log.entity_id.slice(0, 8)}…
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground truncate max-w-[200px]">
                    {log.metadata ? formatMetadata(log.metadata) : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground truncate max-w-[160px]">
                    <span className="font-medium text-foreground">{log.profiles?.full_name ?? "Unknown"}</span>
                    <br />
                    <span className="font-mono">{log.performed_by.slice(0, 8)}…</span>
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
    </div>
  );
};

function formatMetadata(meta: Record<string, unknown>): string {
  const parts: string[] = [];
  if (meta.previous_status && meta.new_status) {
    parts.push(`${meta.previous_status} → ${meta.new_status}`);
  }
  if (meta.title) {
    parts.push(String(meta.title));
  }
  return parts.length > 0 ? parts.join(" · ") : JSON.stringify(meta).slice(0, 80);
}

export default AdminAuditLogs;
