-- Add unique constraint for client_id + raw_message deduplication (Android app expects this)
ALTER TABLE public.mpesa_transactions 
ADD CONSTRAINT unique_client_raw_message UNIQUE (client_id, raw_message);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mpesa_client_raw ON public.mpesa_transactions(client_id, raw_message);