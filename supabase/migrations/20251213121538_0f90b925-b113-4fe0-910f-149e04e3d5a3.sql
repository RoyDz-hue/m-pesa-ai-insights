-- First update any existing rows with rejected/flagged to cleaned
UPDATE public.mpesa_transactions 
SET status = 'cleaned' 
WHERE status IN ('rejected', 'flagged');

-- Drop the old enum and create a simplified one
ALTER TABLE public.mpesa_transactions 
ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.mpesa_transactions 
ALTER COLUMN status TYPE text;

DROP TYPE IF EXISTS transaction_status;

CREATE TYPE transaction_status AS ENUM ('cleaned', 'duplicate');

ALTER TABLE public.mpesa_transactions 
ALTER COLUMN status TYPE transaction_status USING status::transaction_status;

ALTER TABLE public.mpesa_transactions 
ALTER COLUMN status SET DEFAULT 'cleaned'::transaction_status;

-- Clean up review_queue since we don't need fraud flagging anymore
-- Keep table for edge cases but remove fraud-related columns
ALTER TABLE public.review_queue 
DROP COLUMN IF EXISTS fraud_type,
DROP COLUMN IF EXISTS ai_explanation;