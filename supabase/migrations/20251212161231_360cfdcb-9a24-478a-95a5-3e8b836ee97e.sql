-- Enable realtime for review_queue (if not already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'review_queue'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.review_queue;
  END IF;
END $$;

-- Enable realtime for mobile_clients (if not already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'mobile_clients'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mobile_clients;
  END IF;
END $$;