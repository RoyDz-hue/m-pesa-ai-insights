import { useState } from "react";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTransactions } from "@/hooks/use-mpesa";
import { TransactionTypeBadge, StatusBadge, ConfidenceBadge } from "@/components/dashboard/Badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Filter, Eye, Download, FileSpreadsheet, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MpesaTransaction } from "@/types/mpesa";

export default function Transactions() {
  const { data: transactions, isLoading, refetch } = useTransactions(500);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTx, setSelectedTx] = useState<MpesaTransaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  const filteredTransactions = transactions?.filter((tx) => {
    const matchesSearch =
      !search ||
      tx.transaction_code?.toLowerCase().includes(search.toLowerCase()) ||
      tx.sender?.toLowerCase().includes(search.toLowerCase()) ||
      tx.raw_message?.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === "all" || tx.transaction_type === typeFilter;
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const formatAmount = (amount: number | null) => {
    if (amount === null) return "—";
    return `Ksh ${amount.toLocaleString()}`;
  };

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), "MMM d, h:mm a");
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTransactions?.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions?.map((tx) => tx.id)));
    }
  };

  const handleExport = async (format: "csv" | "excel" | "json") => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-transactions", {
        body: {
          format,
          filters: {
            status: statusFilter !== "all" ? statusFilter : undefined,
            transaction_type: typeFilter !== "all" ? typeFilter : undefined,
          },
        },
      });

      if (error) throw error;

      // Create download
      const blob = new Blob([typeof data === "string" ? data : JSON.stringify(data)], {
        type: format === "json" ? "application/json" : "text/csv",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions_${new Date().toISOString().split("T")[0]}.${format === "excel" ? "csv" : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${format.toUpperCase()} successfully`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export transactions");
    } finally {
      setIsExporting(false);
    }
  };

  // Mobile card view for transactions
  const MobileTransactionCard = ({ tx }: { tx: MpesaTransaction }) => (
    <div className="glass-card rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={selectedIds.has(tx.id)}
          onCheckedChange={() => toggleSelect(tx.id)}
        />
        <div className="flex-1 flex items-center justify-between" onClick={() => setSelectedTx(tx)}>
          <span className="font-mono text-xs text-foreground">
            {tx.transaction_code || "N/A"}
          </span>
          <TransactionTypeBadge type={tx.transaction_type} />
        </div>
      </div>
      <div className="flex items-center justify-between" onClick={() => setSelectedTx(tx)}>
        <span className="font-semibold text-foreground">
          {formatAmount(tx.amount)}
        </span>
        <StatusBadge status={tx.status} />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate max-w-[150px]">{tx.sender || tx.recipient || "—"}</span>
        <span>{formatDate(tx.transaction_timestamp)}</span>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-foreground">Transactions</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              AI-processed M-PESA transactions
            </p>
          </div>
          
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("excel")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("json")}>
                <Download className="mr-2 h-4 w-4" />
                Export JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Selection info bar */}
        {selectedIds.size > 0 && (
          <div className="glass-card rounded-xl p-3 flex items-center justify-between animate-fade-in">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected for export
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear selection
            </Button>
          </div>
        )}

        {/* Filters - stack on mobile */}
        <div className="glass-card rounded-xl p-3 md:p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-secondary/50 border-border"
              />
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-32 bg-secondary/50 border-border">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Paybill">Paybill</SelectItem>
                  <SelectItem value="Till">Till</SelectItem>
                  <SelectItem value="SendMoney">Send Money</SelectItem>
                  <SelectItem value="Withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="Deposit">Deposit</SelectItem>
                  <SelectItem value="Airtime">Airtime</SelectItem>
                  <SelectItem value="BankToMpesa">Bank to M-PESA</SelectItem>
                  <SelectItem value="MpesaToBank">M-PESA to Bank</SelectItem>
                  <SelectItem value="Reversal">Reversal</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32 bg-secondary/50 border-border">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="uploaded">Uploaded</SelectItem>
                  <SelectItem value="pending_review">Pending</SelectItem>
                  <SelectItem value="cleaned">Cleaned</SelectItem>
                  <SelectItem value="duplicate">Duplicate</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Transactions - Mobile cards / Desktop table */}
        <div className="animate-fade-in">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !filteredTransactions?.length ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              No transactions found
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                <ScrollArea className="h-[calc(100vh-340px)]">
                  <div className="space-y-3 pr-2">
                    {filteredTransactions.map((tx) => (
                      <MobileTransactionCard key={tx.id} tx={tx} />
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block data-grid">
                <ScrollArea className="h-[600px]">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-card border-b border-border z-10">
                      <tr>
                        <th className="text-left p-4">
                          <Checkbox
                            checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                          Tx Code
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                          Type
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                          Amount
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                          Sender
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                          Confidence
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                          Time
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredTransactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className={`hover:bg-muted/30 transition-colors ${selectedIds.has(tx.id) ? "bg-primary/5" : ""}`}
                        >
                          <td className="p-4">
                            <Checkbox
                              checked={selectedIds.has(tx.id)}
                              onCheckedChange={() => toggleSelect(tx.id)}
                            />
                          </td>
                          <td className="p-4">
                            <span className="font-mono text-sm text-foreground">
                              {tx.transaction_code || "N/A"}
                            </span>
                          </td>
                          <td className="p-4">
                            <TransactionTypeBadge type={tx.transaction_type} />
                          </td>
                          <td className="p-4 font-semibold text-foreground">
                            {formatAmount(tx.amount)}
                          </td>
                          <td className="p-4 text-muted-foreground max-w-[200px] truncate">
                            {tx.sender || tx.recipient || "—"}
                          </td>
                          <td className="p-4">
                            <StatusBadge status={tx.status} />
                          </td>
                          <td className="p-4">
                            {tx.ai_metadata?.confidence !== undefined ? (
                              <ConfidenceBadge confidence={tx.ai_metadata.confidence} />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">
                            {formatDate(tx.transaction_timestamp)}
                          </td>
                          <td className="p-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedTx(tx)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>
            </>
          )}
        </div>

        {/* Transaction Detail Dialog */}
        <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
          <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">Transaction Details</DialogTitle>
            </DialogHeader>
            {selectedTx && (
              <div className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="text-xs md:text-sm text-muted-foreground">Transaction Code</label>
                    <p className="font-mono text-sm md:text-base text-foreground">
                      {selectedTx.transaction_code || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs md:text-sm text-muted-foreground">Type</label>
                    <div className="mt-1">
                      <TransactionTypeBadge type={selectedTx.transaction_type} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs md:text-sm text-muted-foreground">Amount</label>
                    <p className="text-xl md:text-2xl font-bold text-foreground">
                      {formatAmount(selectedTx.amount)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs md:text-sm text-muted-foreground">Balance</label>
                    <p className="font-semibold text-foreground">
                      {formatAmount(selectedTx.balance)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs md:text-sm text-muted-foreground">Sender</label>
                    <p className="text-foreground text-sm">{selectedTx.sender || "—"}</p>
                  </div>
                  <div>
                    <label className="text-xs md:text-sm text-muted-foreground">Status</label>
                    <div className="mt-1">
                      <StatusBadge status={selectedTx.status} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs md:text-sm text-muted-foreground">Raw Message</label>
                  <p className="mt-1 p-2 md:p-3 bg-muted rounded-lg font-mono text-xs md:text-sm text-foreground break-words">
                    {selectedTx.raw_message}
                  </p>
                </div>

                <div>
                  <label className="text-xs md:text-sm text-muted-foreground">AI Metadata</label>
                  <pre className="mt-1 p-2 md:p-3 bg-muted rounded-lg font-mono text-[10px] md:text-xs text-foreground overflow-auto max-h-32 md:max-h-40">
                    {JSON.stringify(selectedTx.ai_metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
