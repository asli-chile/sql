ALTER TABLE public.registros
ADD COLUMN IF NOT EXISTS ref_cliente text;

-- Optional: seed existing values with empty string instead of null
UPDATE public.registros
SET ref_cliente = ''
WHERE ref_cliente IS NULL;
