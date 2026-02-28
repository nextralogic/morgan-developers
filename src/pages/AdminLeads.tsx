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

const STATUS_OPTIONS: LeadStatus[] = ["new", "in_progress", "contacted", "closed", "archived"];

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  contacted: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  closed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  archived: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  in_progress: "In Progress",
  contacted: "Contacted",
  closed: "Closed",
  archived: "Archived",
};

interface AdminLeadsProps {
  enabled: boolean;
}

const AdminLeads = ({ enabled }: AdminLeadsProps) => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<AdminLeadFilters>({ page: 1, pageSize: 20 });
  const [searchInput, setSearchInput] = useState("");
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

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
      toast.success(`Lead status updated to ${STATUS_LABELS[newStatus]}`);
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      // Update selected lead if open
      if (selectedLead?.id === leadId) {
        setSelectedLead((prev) => prev ? { ...prev, status: newStatus } : null);
      }
    } catch {
      toast.error("Failed to update lead status.");
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedLead) return;
    setSavingNotes(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await updateLeadStatus(selectedLead.id, selectedLead.status, editNotes, user?.id);
      toast.success("Notes saved.");
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      setSelectedLead((prev) => prev ? { ...prev, notes: editNotes } : null);
    } catch {
      toast.error("Failed to save notes.");
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
        <h2 className="font-heading text-2xl font-bold">Lead Management</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {result?.totalCount ?? 0} leads total
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch}>Search</Button>

        <Select
          value={filters.status ?? "all"}
          onValueChange={(v) => updateFilters({ status: v === "all" ? undefined : v as LeadStatus })}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filters.query || filters.status) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearchInput(""); setFilters({ page: 1, pageSize: 20 }); }}>
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Contact</TableHead>
              <TableHead className="hidden lg:table-cell">Property</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Source</TableHead>
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
                  No leads found.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openLeadDetail(lead)}
                >
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-medium max-w-[160px] truncate">
                    {lead.name}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                    <div className="flex flex-col gap-0.5">
                      <span className="truncate max-w-[180px]">{lead.email}</span>
                      {lead.phone && <span>{lead.phone}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground truncate max-w-[180px]">
                    {lead.properties ? (
                      <span>#{lead.properties.property_public_id} · {lead.properties.title}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={lead.status}
                      onValueChange={(v) => handleStatusChange(lead.id, v as LeadStatus)}
                    >
                      <SelectTrigger className="h-7 w-[120px] border-0 p-0">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[lead.status]}`}>
                          {STATUS_LABELS[lead.status]}
                          <ChevronDown className="h-3 w-3" />
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="text-xs capitalize">{lead.source}</Badge>
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
        onPageChange={(p) => updateFilters({ page: p })}
      />

      {/* Lead Detail Drawer */}
      <Sheet open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedLead && (
            <>
              <SheetHeader>
                <SheetTitle className="font-heading">{selectedLead.name}</SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                {/* Contact info */}
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
                      <span className="capitalize">{selectedLead.preferred_contact_time}</span>
                    </div>
                  )}
                  {selectedLead.budget_range && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>{selectedLead.budget_range}</span>
                    </div>
                  )}
                </div>

                {/* Property */}
                {selectedLead.properties && (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Property</p>
                    <p className="text-sm font-medium">{selectedLead.properties.title}</p>
                    <p className="text-xs text-muted-foreground">#{selectedLead.properties.property_public_id}</p>
                    <a
                      href={buildPropertyUrl(selectedLead.properties.title, selectedLead.properties.property_public_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      View property <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* Message */}
                {selectedLead.message && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Message</p>
                    <p className="text-sm whitespace-pre-line rounded-lg border bg-muted/20 p-3">
                      {selectedLead.message}
                    </p>
                  </div>
                )}

                {/* Status */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Status</p>
                  <Select
                    value={selectedLead.status}
                    onValueChange={(v) => handleStatusChange(selectedLead.id, v as LeadStatus)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Internal Notes</p>
                  <Textarea
                    rows={4}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Add internal notes about this lead..."
                  />
                  <Button
                    size="sm"
                    className="mt-2"
                    disabled={savingNotes || editNotes === (selectedLead.notes || "")}
                    onClick={handleSaveNotes}
                  >
                    {savingNotes ? "Saving..." : "Save Notes"}
                  </Button>
                </div>

                {/* Meta */}
                <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
                  <p>Created: {new Date(selectedLead.created_at).toLocaleString()}</p>
                  <p>Updated: {new Date(selectedLead.updated_at).toLocaleString()}</p>
                  <p>Source: <span className="capitalize">{selectedLead.source}</span></p>
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
