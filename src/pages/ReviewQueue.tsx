import { format } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useReviewQueue, useResolveReview } from "@/hooks/use-mpesa";
import { TransactionTypeBadge, ConfidenceBadge, PriorityBadge } from "@/components/dashboard/Badges";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function ReviewQueue() {
  const { data: queue, isLoading, refetch } = useReviewQueue();
  const resolveReview = useResolveReview();

  const handleAccept = async (reviewId: string, mpesaId: string) => {
    try {
      await resolveReview.mutateAsync({
        reviewId,
        resolution: "accepted",
        transactionUpdates: { status: "cleaned" },
      });
      toast.success("Transaction accepted");
    } catch (error) {
      toast.error("Failed to accept");
    }
  };

  const handleReject = async (reviewId: string, mpesaId: string) => {
    try {
      await resolveReview.mutateAsync({
        reviewId,
        resolution: "rejected",
        transactionUpdates: { status: "rejected" },
      });
      toast.success("Transaction rejected");
    } catch (error) {
      toast.error("Failed to reject");
    }
  };

  const formatAmount = (amount: number | null) => {
    if (amount === null) return "—";
    return `Ksh ${amount.toLocaleString()}`;
  };

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), "MMM d, h:mm a");
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-foreground">Review Queue</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Manual review required
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Refresh</span>
          </Button>
        </div>

        {/* Queue Stats - 2x2 on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="glass-card rounded-xl p-3 md:p-4 flex items-center gap-3">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-[hsl(var(--status-warning)/0.2)] flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-[hsl(var(--status-warning))]" />
            </div>
            <div>
              <p className="text-lg md:text-2xl font-bold text-foreground">
                {queue?.length || 0}
              </p>
              <p className="text-xs md:text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
          <div className="glass-card rounded-xl p-3 md:p-4 flex items-center gap-3">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-destructive/20 flex items-center justify-center flex-shrink-0">
              <XCircle className="h-5 w-5 md:h-6 md:w-6 text-destructive" />
            </div>
            <div>
              <p className="text-lg md:text-2xl font-bold text-foreground">
                {queue?.filter((q) => q.priority === "critical").length || 0}
              </p>
              <p className="text-xs md:text-sm text-muted-foreground">Critical</p>
            </div>
          </div>
          <div className="glass-card rounded-xl p-3 md:p-4 flex items-center gap-3">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-[hsl(var(--status-warning)/0.2)] flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-[hsl(var(--status-warning))]" />
            </div>
            <div>
              <p className="text-lg md:text-2xl font-bold text-foreground">
                {queue?.filter((q) => q.priority === "high").length || 0}
              </p>
              <p className="text-xs md:text-sm text-muted-foreground">High</p>
            </div>
          </div>
          <div className="glass-card rounded-xl p-3 md:p-4 flex items-center gap-3">
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <div>
              <p className="text-lg md:text-2xl font-bold text-foreground">
                {queue?.filter((q) => q.priority === "normal" || q.priority === "low").length || 0}
              </p>
              <p className="text-xs md:text-sm text-muted-foreground">Normal</p>
            </div>
          </div>
        </div>

        {/* Review Queue List */}
        <div className="animate-fade-in">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !queue?.length ? (
            <div className="glass-card rounded-xl flex flex-col items-center justify-center h-64 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mb-4 text-primary" />
              <p className="text-lg font-medium text-foreground">All caught up!</p>
              <p className="text-sm">No transactions pending</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-380px)] md:h-[600px]">
              <div className="space-y-3 md:space-y-4">
                {queue.map((item) => {
                  const tx = item.mpesa_transactions as any;
                  if (!tx) return null;

                  return (
                    <div
                      key={item.id}
                      className="glass-card rounded-xl p-4 md:p-6"
                    >
                      {/* Header */}
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm md:text-lg text-foreground">
                            {tx.transaction_code || "N/A"}
                          </span>
                          <TransactionTypeBadge type={tx.transaction_type} />
                          <PriorityBadge priority={item.priority} />
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-xl md:text-2xl font-bold text-foreground">
                            {formatAmount(tx.amount)}
                          </p>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {formatDate(tx.transaction_timestamp)}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs md:text-sm text-muted-foreground mb-3">
                        {item.reason}
                      </p>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Sender</p>
                          <p className="text-sm text-foreground truncate">{tx.sender || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                          {tx.ai_metadata?.confidence !== undefined ? (
                            <ConfidenceBadge confidence={tx.ai_metadata.confidence} />
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </div>
                      </div>

                      {/* Raw Message */}
                      <div className="bg-muted/30 rounded-lg p-3 mb-4">
                        <p className="text-xs text-muted-foreground mb-1">Raw Message</p>
                        <p className="font-mono text-xs md:text-sm text-foreground break-words">
                          {tx.raw_message}
                        </p>
                      </div>

                      {/* AI Explanation */}
                      {tx.ai_metadata?.explanation && (
                        <div className="bg-primary/10 rounded-lg p-3 mb-4">
                          <p className="text-xs text-primary font-medium mb-1">AI Explanation</p>
                          <p className="text-xs md:text-sm text-foreground">
                            {tx.ai_metadata.explanation}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(item.id, item.mpesa_id)}
                          disabled={resolveReview.isPending}
                        >
                          <XCircle className="h-4 w-4 md:mr-2" />
                          <span className="hidden md:inline">Reject</span>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAccept(item.id, item.mpesa_id)}
                          disabled={resolveReview.isPending}
                          className="bg-primary hover:bg-primary/90"
                        >
                          {resolveReview.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 md:mr-2" />
                              <span className="hidden md:inline">Accept</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
