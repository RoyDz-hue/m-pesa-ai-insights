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

// Updated to match new simplified database enum
export type TransactionStatus = 
  | 'cleaned' 
  | 'duplicate' 
  | 'rejected'
  | 'flagged';

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
  // Renamed from sender/recipient to match database
  sender_name: string | null;
  recipient_name: string | null;
  transaction_type: TransactionType;
  raw_message: string;
  parsed_data: Record<string, unknown> | null;
  ai_metadata: AiMetadata;
  duplicate_of: string | null;
  status: TransactionStatus;
  transaction_timestamp: number;
  // New columns
  confidence_score: number | null;
  transaction_date: string | null;
  transaction_time: string | null;
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
  fraud_type: string | null;
  ai_explanation: string | null;
  created_at: string;
  mpesa_transactions?: MpesaTransaction;
}

export interface DashboardStats {
  totalToday: number;
  totalThisMonth: number;
  transactionCount: number;
  avgAmount: number;
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
