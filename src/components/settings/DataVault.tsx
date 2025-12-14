import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Download, 
  Filter, 
  Loader2, 
  Database,
  Search,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  MoreHorizontal,
  Eye,
  Pencil,
  X,
  Check
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface FormOption {
  id: string;
  title: string;
}

interface Submission {
  id: string;
  form_id: string;
  form_title: string;
  mpesa_code: string;
  amount_paid: number;
  name: string | null;
  admission_number: string | null;
  form_data: Record<string, any>;
  beneficiaries_json: any[];
  tip_amount: number | null;
  submitted_at: string;
}

export function DataVault() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [forms, setForms] = useState<FormOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [previewSubmission, setPreviewSubmission] = useState<Submission | null>(null);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editRowData, setEditRowData] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchForms();
    fetchSubmissions();
  }, []);

  const fetchForms = async () => {
    try {
      const { data, error } = await supabase
        .from("public_forms")
        .select("id, title")
        .order("title");

      if (error) throw error;
      setForms(data || []);
    } catch (error) {
      console.error("Error fetching forms:", error);
    }
  };

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("form_submissions")
        .select(`
          id,
          form_id,
          mpesa_code,
          amount_paid,
          name,
          admission_number,
          form_data,
          beneficiaries_json,
          tip_amount,
          submitted_at,
          public_forms!inner(title)
        `)
        .order("submitted_at", { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((s: any) => ({
        ...s,
        form_title: s.public_forms?.title || "Unknown Form",
        form_data: (s.form_data || {}) as Record<string, any>,
        beneficiaries_json: (s.beneficiaries_json || []) as any[]
      }));

      setSubmissions(formatted);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubmissions = submissions.filter((s) => {
    if (selectedForm !== "all" && s.form_id !== selectedForm) return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const searchFields = [
        s.mpesa_code,
        s.name,
        s.admission_number,
        ...Object.values(s.form_data || {}).map(v => String(v))
      ].filter(Boolean);
      
      if (!searchFields.some(f => f?.toLowerCase().includes(query))) return false;
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      if (new Date(s.submitted_at) < fromDate) return false;
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59);
      if (new Date(s.submitted_at) > toDate) return false;
    }

    return true;
  });

  const toggleSelectAll = () => {
    if (selectedRows.size === filteredSubmissions.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredSubmissions.map(s => s.id)));
    }
  };

  const toggleRow = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const startEditing = (id: string, field: string, value: string) => {
    setEditingCell({ id, field });
    setEditValue(value);
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    
    try {
      const submission = submissions.find(s => s.id === editingCell.id);
      if (!submission) return;

      let updateData: any = {};
      
      if (["name", "admission_number", "amount_paid", "tip_amount"].includes(editingCell.field)) {
        updateData[editingCell.field] = editingCell.field.includes("amount") 
          ? parseFloat(editValue) || 0 
          : editValue;
      } else {
        // It's a form_data field
        updateData.form_data = {
          ...submission.form_data,
          [editingCell.field]: editValue
        };
      }

      const { error } = await supabase
        .from("form_submissions")
        .update(updateData)
        .eq("id", editingCell.id);

      if (error) throw error;

      toast.success("Updated successfully");
      fetchSubmissions();
    } catch (error: any) {
      toast.error("Failed to update", { description: error.message });
    } finally {
      setEditingCell(null);
      setEditValue("");
    }
  };

  const deleteSingleRow = async (id: string) => {
    if (!confirm("Delete this submission?")) return;

    try {
      const { error } = await supabase
        .from("form_submissions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Submission deleted");
      fetchSubmissions();
    } catch (error: any) {
      toast.error("Failed to delete", { description: error.message });
    }
  };

  const deleteSelected = async () => {
    if (selectedRows.size === 0) return;
    
    if (!confirm(`Delete ${selectedRows.size} selected submissions?`)) return;

    try {
      const { error } = await supabase
        .from("form_submissions")
        .delete()
        .in("id", Array.from(selectedRows));

      if (error) throw error;

      toast.success(`Deleted ${selectedRows.size} submissions`);
      setSelectedRows(new Set());
      fetchSubmissions();
    } catch (error: any) {
      toast.error("Failed to delete", { description: error.message });
    }
  };

  const startRowEdit = (submission: Submission) => {
    setEditingRow(submission.id);
    setEditRowData({
      name: submission.name || "",
      admission_number: submission.admission_number || "",
      amount_paid: submission.amount_paid,
      tip_amount: submission.tip_amount || 0,
      ...submission.form_data
    });
  };

  const cancelRowEdit = () => {
    setEditingRow(null);
    setEditRowData({});
  };

  const saveRowEdit = async () => {
    if (!editingRow) return;

    try {
      const submission = submissions.find(s => s.id === editingRow);
      if (!submission) return;

      const { name, admission_number, amount_paid, tip_amount, ...formDataFields } = editRowData;
      
      const { error } = await supabase
        .from("form_submissions")
        .update({
          name: name || null,
          admission_number: admission_number || null,
          amount_paid: parseFloat(amount_paid) || 0,
          tip_amount: parseFloat(tip_amount) || 0,
          form_data: { ...submission.form_data, ...formDataFields }
        })
        .eq("id", editingRow);

      if (error) throw error;

      toast.success("Updated successfully");
      setEditingRow(null);
      setEditRowData({});
      fetchSubmissions();
    } catch (error: any) {
      toast.error("Failed to update", { description: error.message });
    }
  };

  const exportToExcel = () => {
    const dataToExport = selectedRows.size > 0 
      ? filteredSubmissions.filter(s => selectedRows.has(s.id))
      : filteredSubmissions;

    if (dataToExport.length === 0) {
      toast.error("No data to export");
      return;
    }

    // Gather all unique form_data keys
    const allFormDataKeys = new Set<string>();
    dataToExport.forEach(s => {
      Object.keys(s.form_data || {}).forEach(k => allFormDataKeys.add(k));
    });

    // Build CSV headers
    const headers = [
      "Form",
      "M-Pesa Code",
      "Amount Paid",
      "Name",
      "Admission Number",
      "Tip Amount",
      "Submitted At",
      ...Array.from(allFormDataKeys),
      "Beneficiaries"
    ];

    // Build CSV rows
    const rows = dataToExport.map(s => [
      s.form_title,
      s.mpesa_code,
      s.amount_paid,
      s.name || "",
      s.admission_number || "",
      s.tip_amount || 0,
      format(new Date(s.submitted_at), "yyyy-MM-dd HH:mm"),
      ...Array.from(allFormDataKeys).map(k => s.form_data?.[k] || ""),
      JSON.stringify(s.beneficiaries_json || [])
    ]);

    // Convert to CSV with BOM for Excel
    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `form_submissions_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    
    toast.success(`Exported ${dataToExport.length} records`);
  };

  // Get all unique columns from form_data across all submissions
  const allColumns = new Set<string>();
  filteredSubmissions.forEach(s => {
    Object.keys(s.form_data || {}).forEach(k => allColumns.add(k));
  });

  return (
    <Card className="flex flex-col h-[calc(100vh-200px)]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Data Vault
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-4 pt-0 overflow-hidden">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <div className="space-y-1">
            <Label className="text-xs">Form</Label>
            <Select value={selectedForm} onValueChange={setSelectedForm}>
              <SelectTrigger>
                <SelectValue placeholder="All Forms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Forms</SelectItem>
                {forms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From Date</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To Date</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" size="icon" onClick={fetchSubmissions}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button 
              variant="destructive" 
              size="icon" 
              onClick={deleteSelected}
              disabled={selectedRows.size === 0}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button onClick={exportToExcel} className="flex-1">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
          <span>{filteredSubmissions.length} records</span>
          {selectedRows.size > 0 && (
            <Badge variant="secondary">{selectedRows.size} selected</Badge>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Database className="h-12 w-12 mb-2 opacity-50" />
            <p>No submissions found</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedRows.size === filteredSubmissions.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                  <TableHead className="min-w-[100px]">Form</TableHead>
                  <TableHead className="min-w-[110px]">M-Pesa Code</TableHead>
                  <TableHead className="min-w-[70px]">Amount</TableHead>
                  <TableHead className="min-w-[100px]">Name</TableHead>
                  <TableHead className="min-w-[100px]">Adm No.</TableHead>
                  {Array.from(allColumns).slice(0, 4).map((col) => (
                    <TableHead key={col} className="min-w-[90px] capitalize text-xs">
                      {col.replace(/_/g, " ")}
                    </TableHead>
                  ))}
                  <TableHead className="min-w-[50px]">Tip</TableHead>
                  <TableHead className="min-w-[90px]">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.map((s) => (
                  <TableRow key={s.id} className={editingRow === s.id ? "bg-muted/50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.has(s.id)}
                        onCheckedChange={() => toggleRow(s.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {editingRow === s.id ? (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={saveRowEdit}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelRowEdit}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => setPreviewSubmission(s)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => startRowEdit(s)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Row
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteSingleRow(s.id)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-xs">{s.form_title}</TableCell>
                    <TableCell className="font-mono text-[10px]">{s.mpesa_code}</TableCell>
                    <TableCell>
                      {editingRow === s.id ? (
                        <Input
                          type="number"
                          value={editRowData.amount_paid}
                          onChange={(e) => setEditRowData(prev => ({ ...prev, amount_paid: e.target.value }))}
                          className="h-7 w-16 text-xs"
                        />
                      ) : (
                        <span className="text-sm">{s.amount_paid}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingRow === s.id ? (
                        <Input
                          value={editRowData.name}
                          onChange={(e) => setEditRowData(prev => ({ ...prev, name: e.target.value }))}
                          className="h-7 text-xs"
                        />
                      ) : (
                        <span className="text-sm">{s.name || "-"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingRow === s.id ? (
                        <Input
                          value={editRowData.admission_number}
                          onChange={(e) => setEditRowData(prev => ({ ...prev, admission_number: e.target.value }))}
                          className="h-7 text-xs"
                        />
                      ) : (
                        <span className="text-sm">{s.admission_number || "-"}</span>
                      )}
                    </TableCell>
                    {Array.from(allColumns).slice(0, 4).map((col) => (
                      <TableCell key={col}>
                        {editingRow === s.id ? (
                          <Input
                            value={editRowData[col] || ""}
                            onChange={(e) => setEditRowData(prev => ({ ...prev, [col]: e.target.value }))}
                            className="h-7 text-xs"
                          />
                        ) : (
                          <span className="text-xs">{s.form_data?.[col] || "-"}</span>
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-sm">{s.tip_amount || 0}</TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">
                      {format(new Date(s.submitted_at), "MMM d, HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>

      {/* Preview Dialog */}
      <Dialog open={!!previewSubmission} onOpenChange={() => setPreviewSubmission(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Submission Details
            </DialogTitle>
          </DialogHeader>
          {previewSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Form</Label>
                  <p className="font-medium">{previewSubmission.form_title}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">M-Pesa Code</Label>
                  <p className="font-mono">{previewSubmission.mpesa_code}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Amount Paid</Label>
                  <p className="font-medium">Ksh {previewSubmission.amount_paid}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tip Amount</Label>
                  <p>Ksh {previewSubmission.tip_amount || 0}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <p>{previewSubmission.name || "-"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Admission No.</Label>
                  <p>{previewSubmission.admission_number || "-"}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs text-muted-foreground">Submitted At</Label>
                  <p>{format(new Date(previewSubmission.submitted_at), "PPP 'at' p")}</p>
                </div>
              </div>

              {/* Dynamic Form Data */}
              {Object.keys(previewSubmission.form_data || {}).length > 0 && (
                <div className="border-t pt-4">
                  <Label className="text-xs text-muted-foreground mb-2 block">Additional Fields</Label>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {Object.entries(previewSubmission.form_data).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</Label>
                        <p>{String(value) || "-"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Beneficiaries */}
              {previewSubmission.beneficiaries_json?.length > 0 && (
                <div className="border-t pt-4">
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Beneficiaries ({previewSubmission.beneficiaries_json.length})
                  </Label>
                  <div className="space-y-2">
                    {previewSubmission.beneficiaries_json.map((b: any, i: number) => (
                      <div key={i} className="bg-muted rounded-md p-2 text-sm">
                        <p className="font-medium">#{i + 1}: {b.name || "Unknown"}</p>
                        {Object.entries(b).filter(([k]) => k !== "name").map(([k, v]) => (
                          <p key={k} className="text-xs text-muted-foreground capitalize">
                            {k.replace(/_/g, " ")}: {String(v)}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => {
                  startRowEdit(previewSubmission);
                  setPreviewSubmission(null);
                }}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => {
                  deleteSingleRow(previewSubmission.id);
                  setPreviewSubmission(null);
                }}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
