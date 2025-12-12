import { format } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useReviewQueue, useResolveReview } from "@/hooks/use-mpesa";
import { TransactionTypeBadge, StatusBadge, ConfidenceBadge, PriorityBadge } from "@/components/dashboard/Badges";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle, XCircle, Edit, AlertTriangle } from "lucide-react";
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
      toast.success("Transaction accepted and cleaned");
    } catch (error) {
      toast.error("Failed to accept transaction");
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
      toast.error("Failed to reject transaction");
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Review Queue</h1>
            <p className="text-muted-foreground">
              Transactions requiring manual review
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>

        {/* Queue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-status-warning/20 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-status-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {queue?.length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Pending Review</p>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-destructive/20 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {queue?.filter((q) => q.priority === "critical").length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Critical</p>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-status-warning/20 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-status-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {queue?.filter((q) => q.priority === "high").length || 0}
              </p>
              <p className="text-sm text-muted-foreground">High Priority</p>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {queue?.filter((q) => q.priority === "normal" || q.priority === "low").length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Normal</p>
            </div>
          </div>
        </div>

        {/* Review Queue List */}
        <div className="data-grid animate-fade-in">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !queue?.length ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mb-4 text-primary" />
              <p className="text-lg font-medium text-foreground">All caught up!</p>
              <p>No transactions pending review</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="divide-y divide-border">
                {queue.map((item) => {
                  const tx = item.mpesa_transactions as any;
                  if (!tx) return null;

                  return (
                    <div
                      key={item.id}
                      className="p-6 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-lg text-foreground">
                                {tx.transaction_code || "N/A"}
                              </span>
                              <TransactionTypeBadge type={tx.transaction_type} />
                              <PriorityBadge priority={item.priority} />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {item.reason}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-foreground">
                            {formatAmount(tx.amount)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(tx.transaction_timestamp)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Sender</p>
                          <p className="text-foreground">{tx.sender || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Confidence</p>
                          {tx.ai_metadata?.confidence !== undefined ? (
                            <ConfidenceBadge confidence={tx.ai_metadata.confidence} />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>

                      <div className="bg-muted/30 rounded-lg p-4 mb-4">
                        <p className="text-sm text-muted-foreground mb-1">Raw Message</p>
                        <p className="font-mono text-sm text-foreground">
                          {tx.raw_message}
                        </p>
                      </div>

                      {tx.ai_metadata?.explanation && (
                        <div className="bg-primary/10 rounded-lg p-4 mb-4">
                          <p className="text-sm text-primary font-medium mb-1">AI Explanation</p>
                          <p className="text-sm text-foreground">
                            {tx.ai_metadata.explanation}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(item.id, item.mpesa_id)}
                          disabled={resolveReview.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAccept(item.id, item.mpesa_id)}
                          disabled={resolveReview.isPending}
                          className="bg-primary hover:bg-primary/90"
                        >
                          {resolveReview.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Accept
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
