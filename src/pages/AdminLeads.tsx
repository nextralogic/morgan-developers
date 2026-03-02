import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchLeadsForAdmin,
  updateLeadStatus,
  type AdminLeadFilters,
  type LeadRow,
  type LeadStatus,
} from "@/services/leadService";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import PropertyPagination from "@/components/PropertyPagination";
import { toast } from "sonner";
import { Search, Mail, Phone, Clock, DollarSign, ExternalLink, ChevronDown, MessageSquare } from "lucide-react";
import { buildPropertyUrl } from "@/lib/property-url";
import { useTranslation } from "react-i18next";

const STATUS_OPTIONS: LeadStatus[] = ["new", "in_progress", "contacted", "closed", "archived"];

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  contacted: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  closed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  archived: "bg-muted text-muted-foreground",
};

interface AdminLeadsProps {
  enabled: boolean;
}

const AdminLeads = ({ enabled }: AdminLeadsProps) => {
  const { t, i18n } = useTranslation("admin");
  const numberLocale = i18n.resolvedLanguage?.startsWith("ne") ? "ne-NP" : "en-US";
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<AdminLeadFilters>({ page: 1, pageSize: 20 });
  const [searchInput, setSearchInput] = useState("");
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const statusLabels: Record<LeadStatus, string> = {
    new: t("leads.statuses.new"),
    in_progress: t("leads.statuses.in_progress"),
    contacted: t("leads.statuses.contacted"),
    closed: t("leads.statuses.closed"),
    archived: t("leads.statuses.archived"),
  };

  const sourceLabel = (source: string | null | undefined) => {
    if (!source) return t("leads.sources.unknown");
    return t(`leads.sources.${source}` as any, { defaultValue: source });
  };

  const contactTimeLabel = (value: string | null | undefined) => {
    if (!value) return "";
    return t(`leads.contactTimes.${value}` as any, { defaultValue: value });
  };

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-leads", filters],
    queryFn: () => fetchLeadsForAdmin(filters),
    enabled,
    placeholderData: (prev) => prev,
  });

  const updateFilters = useCallback((patch: Partial<AdminLeadFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  }, []);

  const handleSearch = () => updateFilters({ query: searchInput || undefined });

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await updateLeadStatus(leadId, newStatus, undefined, user?.id);
      toast.success(t("leads.toasts.statusUpdated", { status: statusLabels[newStatus] }));
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      if (selectedLead?.id === leadId) {
        setSelectedLead((prev) => prev ? { ...prev, status: newStatus } : null);
      }
    } catch {
      toast.error(t("leads.toasts.statusUpdateFailed"));
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedLead) return;
    setSavingNotes(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await updateLeadStatus(selectedLead.id, selectedLead.status, editNotes, user?.id);
      toast.success(t("leads.toasts.notesSaved"));
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      setSelectedLead((prev) => prev ? { ...prev, notes: editNotes } : null);
    } catch {
      toast.error(t("leads.toasts.notesFailed"));
    } finally {
      setSavingNotes(false);
    }
  };

  const openLeadDetail = (lead: LeadRow) => {
    setSelectedLead(lead);
    setEditNotes(lead.notes || "");
  };

  const leads = result?.data ?? [];
  const totalPages = Math.ceil((result?.totalCount ?? 0) / (result?.pageSize ?? 20));
  const page = result?.page ?? 1;

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-heading text-2xl font-bold">{t("leads.header.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("leads.header.total", { count: result?.totalCount ?? 0 })}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("leads.filters.searchPlaceholder")}
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch}>
          {t("leads.filters.search")}
        </Button>

        <Select
          value={filters.status ?? "all"}
          onValueChange={(v) => updateFilters({ status: v === "all" ? undefined : v as LeadStatus })}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t("leads.filters.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("leads.filters.allStatuses")}</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filters.query || filters.status) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearchInput(""); setFilters({ page: 1, pageSize: 20 }); }}>
            {t("leads.filters.clear")}
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("leads.table.date")}</TableHead>
              <TableHead>{t("leads.table.name")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("leads.table.contact")}</TableHead>
              <TableHead className="hidden lg:table-cell">{t("leads.table.property")}</TableHead>
              <TableHead>{t("leads.table.status")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("leads.table.source")}</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && leads.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 w-full animate-pulse rounded bg-muted" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  {t("leads.table.noLeads")}
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openLeadDetail(lead)}
                >
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(lead.created_at).toLocaleDateString(numberLocale)}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate font-medium">
                    {lead.name}
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                    <div className="flex flex-col gap-0.5">
                      <span className="max-w-[180px] truncate">{lead.email}</span>
                      {lead.phone && <span>{lead.phone}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden max-w-[180px] truncate text-xs text-muted-foreground lg:table-cell">
                    {lead.properties ? (
                      <span>#{lead.properties.property_public_id} · {lead.properties.title}</span>
                    ) : t("shared.none")}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={lead.status}
                      onValueChange={(v) => handleStatusChange(lead.id, v as LeadStatus)}
                    >
                      <SelectTrigger className="h-7 w-[120px] border-0 p-0">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[lead.status]}`}>
                          {statusLabels[lead.status]}
                          <ChevronDown className="h-3 w-3" />
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="text-xs">{sourceLabel(lead.source)}</Badge>
                  </TableCell>
                  <TableCell>
                    {lead.message && <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />}
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

      <Sheet open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selectedLead && (
            <>
              <SheetHeader>
                <SheetTitle className="font-heading">{selectedLead.name}</SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${selectedLead.email}`} className="text-primary underline">{selectedLead.email}</a>
                  </div>
                  {selectedLead.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${selectedLead.phone}`} className="text-primary underline">{selectedLead.phone}</a>
                    </div>
                  )}
                  {selectedLead.preferred_contact_time && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{contactTimeLabel(selectedLead.preferred_contact_time)}</span>
                    </div>
                  )}
                  {selectedLead.budget_range && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>{selectedLead.budget_range}</span>
                    </div>
                  )}
                </div>

                {selectedLead.properties && (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">{t("leads.detail.property")}</p>
                    <p className="text-sm font-medium">{selectedLead.properties.title}</p>
                    <p className="text-xs text-muted-foreground">#{selectedLead.properties.property_public_id}</p>
                    <a
                      href={buildPropertyUrl(selectedLead.properties.title, selectedLead.properties.property_public_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {t("leads.detail.viewProperty")} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {selectedLead.message && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">{t("leads.detail.message")}</p>
                    <p className="whitespace-pre-line rounded-lg border bg-muted/20 p-3 text-sm">
                      {selectedLead.message}
                    </p>
                  </div>
                )}

                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("leads.detail.status")}</p>
                  <Select
                    value={selectedLead.status}
                    onValueChange={(v) => handleStatusChange(selectedLead.id, v as LeadStatus)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("leads.detail.internalNotes")}</p>
                  <Textarea
                    rows={4}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder={t("leads.detail.internalNotesPlaceholder")}
                  />
                  <Button
                    size="sm"
                    className="mt-2"
                    disabled={savingNotes || editNotes === (selectedLead.notes || "")}
                    onClick={handleSaveNotes}
                  >
                    {savingNotes ? t("leads.detail.savingNotes") : t("leads.detail.saveNotes")}
                  </Button>
                </div>

                <div className="space-y-1 border-t pt-3 text-xs text-muted-foreground">
                  <p>{t("leads.detail.created")} {new Date(selectedLead.created_at).toLocaleString(numberLocale)}</p>
                  <p>{t("leads.detail.updated")} {new Date(selectedLead.updated_at).toLocaleString(numberLocale)}</p>
                  <p>{t("leads.detail.source")} <span>{sourceLabel(selectedLead.source)}</span></p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminLeads;
