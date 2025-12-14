-- Add admin SELECT and UPDATE policies for public_forms
CREATE POLICY "Admins can view all forms"
ON public.public_forms
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all forms"
ON public.public_forms
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Add admin SELECT and UPDATE policies for form_submissions
CREATE POLICY "Admins can view all submissions"
ON public.form_submissions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all submissions"
ON public.form_submissions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));