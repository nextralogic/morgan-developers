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
import { useTranslation } from "react-i18next";

const ENTITY_TYPES = ["property", "lead", "user"] as const;
const ACTIONS = ["publish", "unpublish", "archive", "restore", "status_change", "edit", "note_update", "role_change"] as const;

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
  const { t, i18n } = useTranslation("admin");
  const numberLocale = i18n.resolvedLanguage?.startsWith("ne") ? "ne-NP" : "en-US";
  const [filters, setFilters] = useState<AuditLogFilters>({ page: 1, pageSize: 25 });

  const entityLabels: Record<(typeof ENTITY_TYPES)[number], string> = {
    property: t("audit.entities.property"),
    lead: t("audit.entities.lead"),
    user: t("audit.entities.user"),
  };

  const actionLabels: Record<(typeof ACTIONS)[number], string> = {
    publish: t("audit.actions.publish"),
    unpublish: t("audit.actions.unpublish"),
    archive: t("audit.actions.archive"),
    restore: t("audit.actions.restore"),
    status_change: t("audit.actions.status_change"),
    edit: t("audit.actions.edit"),
    note_update: t("audit.actions.note_update"),
    role_change: t("audit.actions.role_change"),
  };

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
        <h2 className="font-heading text-2xl font-bold">{t("audit.header.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("audit.header.total", { count: result?.totalCount ?? 0 })}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Select
          value={filters.entity_type ?? "all"}
          onValueChange={(value) => updateFilters({ entity_type: value === "all" ? undefined : value })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("audit.filters.allEntities")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("audit.filters.allEntities")}</SelectItem>
            {ENTITY_TYPES.map((entity) => (
              <SelectItem key={entity} value={entity}>{entityLabels[entity]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.action ?? "all"}
          onValueChange={(value) => updateFilters({ action: value === "all" ? undefined : value })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("audit.filters.allActions")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("audit.filters.allActions")}</SelectItem>
            {ACTIONS.map((action) => (
              <SelectItem key={action} value={action}>{actionLabels[action]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({ page: 1, pageSize: 25 })}>
            {t("audit.filters.clear")}
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">{t("audit.table.date")}</TableHead>
              <TableHead className="w-[100px]">{t("audit.table.entity")}</TableHead>
              <TableHead className="w-[130px]">{t("audit.table.action")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("audit.table.entityId")}</TableHead>
              <TableHead className="hidden lg:table-cell">{t("audit.table.details")}</TableHead>
              <TableHead className="hidden md:table-cell w-[120px]">{t("audit.table.performedBy")}</TableHead>
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
                  {t("audit.table.noLogs")}
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(log.performed_at).toLocaleString(numberLocale)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {t(`audit.entities.${log.entity_type}` as any, { defaultValue: log.entity_type })}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${ACTION_COLORS[log.action] ?? "bg-muted text-muted-foreground"}`}>
                      {t(`audit.actions.${log.action}` as any, { defaultValue: log.action })}
                    </span>
                  </TableCell>
                  <TableCell className="hidden max-w-[120px] truncate font-mono text-xs text-muted-foreground md:table-cell">
                    {log.entity_id.slice(0, 8)}…
                  </TableCell>
                  <TableCell className="hidden max-w-[200px] truncate text-xs text-muted-foreground lg:table-cell">
                    {log.metadata ? formatMetadata(log.metadata, t) : t("audit.metadata.unavailable")}
                  </TableCell>
                  <TableCell className="hidden max-w-[160px] truncate text-xs text-muted-foreground md:table-cell">
                    <span className="font-medium text-foreground">{log.profiles?.full_name ?? t("audit.table.unknownUser")}</span>
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
        onPageChange={(nextPage) => updateFilters({ page: nextPage })}
      />
    </div>
  );
};

function formatMetadata(meta: Record<string, unknown>, t: (key: string, options?: Record<string, unknown>) => string): string {
  const statusLabel = (value: unknown) => {
    if (typeof value !== "string") return "";
    return t(`propertyStatuses.${value}`, { defaultValue: value });
  };

  const parts: string[] = [];
  if (meta.previous_status && meta.new_status) {
    parts.push(t("audit.metadata.statusTransition", {
      previous: statusLabel(meta.previous_status),
      next: statusLabel(meta.new_status),
    }));
  }
  if (meta.title) {
    parts.push(String(meta.title));
  }
  return parts.length > 0 ? parts.join(" · ") : t("audit.metadata.unavailable");
}

export default AdminAuditLogs;
