import { cn } from "@/lib/utils";
import type { TransactionType, TransactionStatus, ReviewPriority } from "@/types/mpesa";

interface TransactionTypeBadgeProps {
  type: TransactionType;
}

const typeStyles: Record<TransactionType, string> = {
  Paybill: "tx-paybill",
  Till: "tx-till",
  SendMoney: "tx-send",
  Withdrawal: "tx-withdraw",
  Deposit: "tx-deposit",
  Airtime: "tx-airtime",
  BankToMpesa: "tx-bank",
  MpesaToBank: "tx-bank",
  Reversal: "tx-reversal",
  Unknown: "bg-muted text-muted-foreground",
};

export function TransactionTypeBadge({ type }: TransactionTypeBadgeProps) {
  return <span className={cn("tx-badge", typeStyles[type])}>{type}</span>;
}

interface StatusBadgeProps {
  status: TransactionStatus;
}

// Simplified: only cleaned or duplicate
const statusStyles: Record<TransactionStatus, { bg: string; text: string; label: string }> = {
  cleaned: { bg: "bg-status-success/20", text: "text-status-success", label: "Cleaned" },
  duplicate: { bg: "bg-muted", text: "text-muted-foreground", label: "Duplicate" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = statusStyles[status];
  return (
    <span className={cn("tx-badge", style.bg, style.text)}>
      {style.label}
    </span>
  );
}

interface ConfidenceBadgeProps {
  confidence: number;
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const percentage = Math.round(confidence * 100);
  const colorClass =
    confidence >= 0.85
      ? "confidence-high"
      : confidence >= 0.7
      ? "confidence-medium"
      : "confidence-low";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            confidence >= 0.85 && "bg-status-success",
            confidence >= 0.7 && confidence < 0.85 && "bg-status-warning",
            confidence < 0.7 && "bg-status-error"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={cn("text-sm font-mono", colorClass)}>{percentage}%</span>
    </div>
  );
}

interface PriorityBadgeProps {
  priority: ReviewPriority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const priorityLabels: Record<ReviewPriority, string> = {
    low: "Low",
    normal: "Normal",
    high: "High",
    critical: "Critical",
  };

  return (
    <span className={cn("font-medium capitalize", `priority-${priority}`)}>
      {priorityLabels[priority]}
    </span>
  );
}
