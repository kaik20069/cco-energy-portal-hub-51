-- Add email column to profiles and populate it; update trigger to store email
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Update signup trigger function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, type, full_name, email)
  VALUES (new.id, 'client', new.raw_user_meta_data->>'full_name', new.email);
  RETURN new;
END;
$function$;

-- Backfill existing emails from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');