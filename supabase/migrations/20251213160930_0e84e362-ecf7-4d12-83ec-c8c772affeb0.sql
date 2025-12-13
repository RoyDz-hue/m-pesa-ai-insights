-- Make name and admission_number nullable since fields are now dynamic
ALTER TABLE public.form_submissions 
ALTER COLUMN name DROP NOT NULL,
ALTER COLUMN admission_number DROP NOT NULL;

-- Add a form_data jsonb column to store dynamic field values
ALTER TABLE public.form_submissions 
ADD COLUMN form_data jsonb DEFAULT '{}'::jsonb;