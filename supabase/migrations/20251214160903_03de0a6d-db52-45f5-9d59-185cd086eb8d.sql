-- Add DELETE policies for admins on all tables

-- mpesa_transactions: Currently no DELETE policy
CREATE POLICY "Admins can delete transactions"
ON public.mpesa_transactions
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- mpesa_audit: Currently no DELETE policy
CREATE POLICY "Admins can delete audit logs"
ON public.mpesa_audit
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- ai_processing_logs: Currently no DELETE policy
CREATE POLICY "Admins can delete AI logs"
ON public.ai_processing_logs
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- profiles: Currently no DELETE policy
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- mpesa_embeddings: Add admin delete policy
CREATE POLICY "Admins can delete embeddings"
ON public.mpesa_embeddings
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- labeled_dataset: Add admin delete policy
CREATE POLICY "Admins can delete labeled data"
ON public.labeled_dataset
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- mobile_clients: Add admin delete policy
CREATE POLICY "Admins can delete mobile clients"
ON public.mobile_clients
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- review_queue: Add admin delete policy (has ALL but explicit DELETE is safer)
CREATE POLICY "Admins can delete review items"
ON public.review_queue
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- public_forms: Add admin delete policy
CREATE POLICY "Admins can delete any forms"
ON public.public_forms
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- form_submissions: Add admin delete policy
CREATE POLICY "Admins can delete any submissions"
ON public.form_submissions
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- user_devices: Add admin delete policy
CREATE POLICY "Admins can delete any device links"
ON public.user_devices
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));