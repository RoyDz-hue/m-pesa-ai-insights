-- Create enum for transaction types
CREATE TYPE public.transaction_type AS ENUM (
  'Paybill', 'Till', 'SendMoney', 'Withdrawal', 'Deposit', 
  'Airtime', 'BankToMpesa', 'MpesaToBank', 'Reversal', 'Unknown'
);

-- Create enum for transaction status
CREATE TYPE public.transaction_status AS ENUM (
  'pending_upload', 'uploaded', 'pending_review', 'cleaned', 'duplicate', 'rejected'
);

-- Create enum for review priority
CREATE TYPE public.review_priority AS ENUM ('low', 'normal', 'high', 'critical');

-- Main M-PESA transactions table
CREATE TABLE public.mpesa_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT NOT NULL,
    client_tx_id TEXT UNIQUE NOT NULL,
    transaction_code TEXT,
    amount NUMERIC,
    balance NUMERIC,
    sender TEXT,
    recipient TEXT,
    transaction_type transaction_type NOT NULL DEFAULT 'Unknown',
    raw_message TEXT NOT NULL,
    parsed_data JSONB,
    ai_metadata JSONB NOT NULL DEFAULT '{}',
    duplicate_of UUID REFERENCES public.mpesa_transactions(id),
    status transaction_status DEFAULT 'uploaded',
    transaction_timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_mpesa_code ON public.mpesa_transactions(transaction_code);
CREATE INDEX idx_mpesa_status ON public.mpesa_transactions(status);
CREATE INDEX idx_mpesa_timestamp ON public.mpesa_transactions(transaction_timestamp);
CREATE INDEX idx_mpesa_type ON public.mpesa_transactions(transaction_type);
CREATE INDEX idx_mpesa_client ON public.mpesa_transactions(client_id);
CREATE INDEX idx_mpesa_created ON public.mpesa_transactions(created_at DESC);

-- Enable RLS on mpesa_transactions
ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read transactions (admin dashboard)
CREATE POLICY "Authenticated users can read transactions"
ON public.mpesa_transactions FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to insert (from edge function)
CREATE POLICY "Authenticated users can insert transactions"
ON public.mpesa_transactions FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow all authenticated users to update transactions
CREATE POLICY "Authenticated users can update transactions"
ON public.mpesa_transactions FOR UPDATE
TO authenticated
USING (true);

-- Human review queue table
CREATE TABLE public.review_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mpesa_id UUID NOT NULL REFERENCES public.mpesa_transactions(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    priority review_priority DEFAULT 'normal',
    assigned_to UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    resolution TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_review_priority ON public.review_queue(priority);
CREATE INDEX idx_review_resolved ON public.review_queue(resolved_at);

ALTER TABLE public.review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage review queue"
ON public.review_queue FOR ALL
TO authenticated
USING (true);

-- Labeled dataset for AI training feedback
CREATE TABLE public.labeled_dataset (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mpesa_id UUID REFERENCES public.mpesa_transactions(id),
    original_parse JSONB NOT NULL,
    corrected_parse JSONB NOT NULL,
    corrected_by UUID NOT NULL REFERENCES auth.users(id),
    correction_type TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.labeled_dataset ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage labeled dataset"
ON public.labeled_dataset FOR ALL
TO authenticated
USING (true);

-- Audit log for tracking all changes
CREATE TABLE public.mpesa_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mpesa_id UUID REFERENCES public.mpesa_transactions(id),
    action TEXT NOT NULL,
    before_state JSONB,
    after_state JSONB,
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_mpesa ON public.mpesa_audit(mpesa_id);
CREATE INDEX idx_audit_created ON public.mpesa_audit(created_at DESC);

ALTER TABLE public.mpesa_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read audit logs"
ON public.mpesa_audit FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert audit logs"
ON public.mpesa_audit FOR INSERT
TO authenticated
WITH CHECK (true);

-- Registered mobile clients table
CREATE TABLE public.mobile_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT UNIQUE NOT NULL,
    device_name TEXT,
    device_model TEXT,
    os_version TEXT,
    app_version TEXT,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.mobile_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage mobile clients"
ON public.mobile_clients FOR ALL
TO authenticated
USING (true);

-- AI processing logs for debugging
CREATE TABLE public.ai_processing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mpesa_id UUID REFERENCES public.mpesa_transactions(id),
    prompt_id TEXT NOT NULL,
    model TEXT NOT NULL,
    input_data JSONB,
    output_data JSONB,
    processing_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_logs_mpesa ON public.ai_processing_logs(mpesa_id);
CREATE INDEX idx_ai_logs_created ON public.ai_processing_logs(created_at DESC);

ALTER TABLE public.ai_processing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read AI logs"
ON public.ai_processing_logs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert AI logs"
ON public.ai_processing_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_mpesa_transactions_updated_at
    BEFORE UPDATE ON public.mpesa_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mobile_clients_updated_at
    BEFORE UPDATE ON public.mobile_clients
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();