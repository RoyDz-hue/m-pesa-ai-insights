export type TransactionType = 
  | 'Paybill' 
  | 'Till' 
  | 'SendMoney' 
  | 'Withdrawal' 
  | 'Deposit' 
  | 'Airtime' 
  | 'BankToMpesa' 
  | 'MpesaToBank' 
  | 'Reversal' 
  | 'Unknown';

export type TransactionStatus = 
  | 'pending_upload' 
  | 'uploaded' 
  | 'pending_review' 
  | 'cleaned' 
  | 'duplicate' 
  | 'rejected';

export type ReviewPriority = 'low' | 'normal' | 'high' | 'critical';

export interface AiMetadata {
  model?: string;
  version?: string;
  prompt_id?: string;
  confidence?: number;
  tags?: string[];
  flags?: string[];
  explanation?: string;
}

export interface MpesaTransaction {
  id: string;
  client_id: string;
  client_tx_id: string;
  transaction_code: string | null;
  amount: number | null;
  balance: number | null;
  sender: string | null;
  recipient: string | null;
  transaction_type: TransactionType;
  raw_message: string;
  parsed_data: Record<string, unknown> | null;
  ai_metadata: AiMetadata;
  duplicate_of: string | null;
  status: TransactionStatus;
  transaction_timestamp: number;
  created_at: string;
  updated_at: string;
}

export interface ReviewQueueItem {
  id: string;
  mpesa_id: string;
  reason: string;
  priority: ReviewPriority;
  assigned_to: string | null;
  resolved_at: string | null;
  resolution: string | null;
  notes: string | null;
  created_at: string;
  mpesa_transactions?: MpesaTransaction;
}

export interface DashboardStats {
  totalToday: number;
  totalThisMonth: number;
  transactionCount: number;
  avgAmount: number;
  pendingReviews: number;
  flaggedTransactions: number;
}

export interface ChartDataPoint {
  date: string;
  amount: number;
  count: number;
}

export interface TransactionTypeData {
  type: TransactionType;
  count: number;
  amount: number;
}
