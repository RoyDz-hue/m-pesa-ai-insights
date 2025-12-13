-- Add used flag to mpesa_transactions
ALTER TABLE public.mpesa_transactions 
ADD COLUMN IF NOT EXISTS used_for_form UUID DEFAULT NULL;

-- Create public_forms table
CREATE TABLE public.public_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  charge_price NUMERIC NOT NULL DEFAULT 0,
  schema_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  public_slug TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create form_submissions table
CREATE TABLE public.form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.public_forms(id) ON DELETE CASCADE,
  mpesa_id UUID NOT NULL REFERENCES public.mpesa_transactions(id),
  name TEXT NOT NULL,
  admission_number TEXT NOT NULL,
  mpesa_code TEXT NOT NULL,
  amount_paid NUMERIC NOT NULL,
  beneficiaries_json JSONB DEFAULT '[]'::jsonb,
  tip_amount NUMERIC DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.public_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS for public_forms (admin can manage their forms)
CREATE POLICY "Users can manage own forms" ON public.public_forms
FOR ALL USING (auth.uid() = user_id);

-- RLS for form_submissions (public can insert, admin can view)
CREATE POLICY "Anyone can submit to published forms" ON public.form_submissions
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.public_forms WHERE id = form_id AND status = 'published')
);

CREATE POLICY "Form owners can view submissions" ON public.form_submissions
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.public_forms WHERE id = form_id AND user_id = auth.uid())
);

-- Index for slug lookups
CREATE INDEX idx_public_forms_slug ON public.public_forms(public_slug) WHERE public_slug IS NOT NULL;

-- Index for mpesa used_for_form
CREATE INDEX idx_mpesa_used_for_form ON public.mpesa_transactions(used_for_form) WHERE used_for_form IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_public_forms_updated_at
BEFORE UPDATE ON public.public_forms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();