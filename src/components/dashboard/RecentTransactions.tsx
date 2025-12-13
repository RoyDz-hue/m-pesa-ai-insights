import { format } from "date-fns";
import { useTransactions } from "@/hooks/use-mpesa";
import { TransactionTypeBadge, StatusBadge, ConfidenceBadge } from "./Badges";
import { Loader2, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";

export function RecentTransactions() {
  const { data, isLoading, error } = useTransactions(10);

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-6 flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-xl p-6 flex items-center justify-center h-96">
        <p className="text-muted-foreground">Failed to load transactions</p>
      </div>
    );
  }

  const formatAmount = (amount: number | null) => {
    if (amount === null) return "—";
    return `Ksh ${amount.toLocaleString()}`;
  };

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), "MMM d, h:mm a");
  };

  return (
    <div className="glass-card rounded-xl animate-fade-in">
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Recent Transactions</h3>
          <p className="text-sm text-muted-foreground">Latest M-PESA activity</p>
        </div>
        <Link
          to="/transactions"
          className="flex items-center text-sm text-primary hover:text-primary/80 transition-colors"
        >
          View all
          <ChevronRight className="h-4 w-4 ml-1" />
        </Link>
      </div>

      <ScrollArea className="h-80">
        {!data?.length ? (
          <div className="p-6 text-center text-muted-foreground">
            No transactions yet
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.map((tx) => (
              <div
                key={tx.id}
                className="p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <TransactionTypeBadge type={tx.transaction_type} />
                    <span className="font-mono text-sm text-muted-foreground">
                      {tx.transaction_code || "N/A"}
                    </span>
                  </div>
                  <span className="font-semibold text-foreground">
                    {formatAmount(tx.amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={tx.status} />
                    {tx.ai_metadata?.confidence !== undefined && (
                      <ConfidenceBadge confidence={tx.ai_metadata.confidence} />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(tx.transaction_timestamp)}
                  </span>
                </div>
                {tx.sender_name && (
                  <p className="mt-2 text-sm text-muted-foreground truncate">
                    {tx.sender_name}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
