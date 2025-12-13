-- Add RLS policy for anonymous users to read published forms
CREATE POLICY "Anyone can view published forms" 
ON public.public_forms 
FOR SELECT 
USING (status = 'published');