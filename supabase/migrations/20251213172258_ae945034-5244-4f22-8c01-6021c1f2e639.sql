-- Allow form owners to update submissions
CREATE POLICY "Form owners can update submissions"
ON public.form_submissions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public_forms
    WHERE public_forms.id = form_submissions.form_id
    AND public_forms.user_id = auth.uid()
  )
);

-- Allow form owners to delete submissions
CREATE POLICY "Form owners can delete submissions"
ON public.form_submissions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public_forms
    WHERE public_forms.id = form_submissions.form_id
    AND public_forms.user_id = auth.uid()
  )
);