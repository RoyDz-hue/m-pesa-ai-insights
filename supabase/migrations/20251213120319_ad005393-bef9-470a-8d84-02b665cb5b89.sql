-- Step 1: Update transaction_status enum to remove obsolete statuses
-- First, update any existing records with obsolete statuses to 'cleaned'
UPDATE public.mpesa_transactions 
SET status = 'cleaned' 
WHERE status IN ('pending_upload', 'uploaded', 'pending_review');

-- Step 2: Create new simplified status enum
CREATE TYPE transaction_status_new AS ENUM ('cleaned', 'duplicate', 'rejected', 'flagged');

-- Step 3: Alter the column to use new enum
ALTER TABLE public.mpesa_transactions 
ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.mpesa_transactions 
ALTER COLUMN status TYPE transaction_status_new 
USING (
  CASE 
    WHEN status::text IN ('pending_upload', 'uploaded', 'pending_review') THEN 'cleaned'::transaction_status_new
    WHEN status::text = 'cleaned' THEN 'cleaned'::transaction_status_new
    WHEN status::text = 'duplicate' THEN 'duplicate'::transaction_status_new
    WHEN status::text = 'rejected' THEN 'rejected'::transaction_status_new
    ELSE 'cleaned'::transaction_status_new
  END
);

ALTER TABLE public.mpesa_transactions 
ALTER COLUMN status SET DEFAULT 'cleaned'::transaction_status_new;

-- Step 4: Drop old enum and rename new one
DROP TYPE IF EXISTS transaction_status;
ALTER TYPE transaction_status_new RENAME TO transaction_status;

-- Step 5: Add confidence_score as a direct column for easier querying
ALTER TABLE public.mpesa_transactions 
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(5,4) DEFAULT 0.0;

-- Step 6: Add transaction_date and transaction_time columns for clearer data model
ALTER TABLE public.mpesa_transactions 
ADD COLUMN IF NOT EXISTS transaction_date DATE;

ALTER TABLE public.mpesa_transactions 
ADD COLUMN IF NOT EXISTS transaction_time TIME;

-- Step 7: Rename sender/recipient to sender_name/recipient_name for clarity
ALTER TABLE public.mpesa_transactions 
RENAME COLUMN sender TO sender_name;

ALTER TABLE public.mpesa_transactions 
RENAME COLUMN recipient TO recipient_name;

-- Step 8: Create unique constraint on transaction_code per client for deduplication
-- Drop if exists first to avoid errors
ALTER TABLE public.mpesa_transactions 
DROP CONSTRAINT IF EXISTS mpesa_transactions_client_tx_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mpesa_unique_tx_code 
ON public.mpesa_transactions(client_id, transaction_code) 
WHERE transaction_code IS NOT NULL;

-- Step 9: Add index on confidence_score for filtering low-confidence transactions
CREATE INDEX IF NOT EXISTS idx_mpesa_confidence 
ON public.mpesa_transactions(confidence_score);

-- Step 10: Add index on status for quick filtering
CREATE INDEX IF NOT EXISTS idx_mpesa_status 
ON public.mpesa_transactions(status);

-- Step 11: Add index on transaction_type for analytics
CREATE INDEX IF NOT EXISTS idx_mpesa_type 
ON public.mpesa_transactions(transaction_type);

-- Step 12: Update review_queue to only be for fraud/flagged cases - add fraud_type column
ALTER TABLE public.review_queue 
ADD COLUMN IF NOT EXISTS fraud_type TEXT;

ALTER TABLE public.review_queue 
ADD COLUMN IF NOT EXISTS ai_explanation TEXT;

-- Step 13: Comment the tables for documentation
COMMENT ON TABLE public.mpesa_transactions IS 'AI-processed M-PESA transactions - all records are fully parsed and cleaned';
COMMENT ON COLUMN public.mpesa_transactions.status IS 'Transaction status: cleaned (default), duplicate, rejected, or flagged';
COMMENT ON COLUMN public.mpesa_transactions.confidence_score IS 'AI confidence score (0.0 to 1.0) for the parsing accuracy';
COMMENT ON COLUMN public.mpesa_transactions.raw_message IS 'Original SMS text - kept for audit trail only';
COMMENT ON TABLE public.review_queue IS 'Queue for fraud-flagged transactions requiring manual review';