-- Keep public.profiles in step with Supabase Auth users.
--
-- Every new login (email + password or Google) gets a customer profile automatically. Staff are not customers:
-- adding someone to public.admins removes their profile (see the last trigger), so they never appear in the
-- customer list. (Auth writes app_metadata after the insert, so the trigger can't tell staff apart at sign-up.)

CREATE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
      NULLIF(trim(NEW.raw_user_meta_data ->> 'name'), ''), -- Google
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    NULLIF(trim(NEW.raw_user_meta_data ->> 'phone'), '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- A confirmed email change in Auth is copied to the profile and the admin row.
CREATE FUNCTION public.handle_auth_email_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles SET email = NEW.email, updated_at = now() WHERE id = NEW.id;
  UPDATE public.admins SET email = NEW.email, updated_at = now() WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (NEW.email IS DISTINCT FROM OLD.email AND NEW.email IS NOT NULL)
  EXECUTE FUNCTION public.handle_auth_email_change();

-- An admin login is staff, not a customer: drop the profile the sign-up trigger created.
CREATE FUNCTION public.handle_new_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_admin_created
  AFTER INSERT ON public.admins
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_admin();

-- Trigger functions only; nobody should call them through the Data API.
REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_auth_email_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_admin() FROM PUBLIC, anon, authenticated;
