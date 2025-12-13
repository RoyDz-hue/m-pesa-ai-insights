-- Add DELETE policy for mobile_clients
CREATE POLICY "Authenticated users can delete mobile clients"
ON public.mobile_clients
FOR DELETE
USING (true);