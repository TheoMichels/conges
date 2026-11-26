BEGIN;
CREATE TABLE holy.members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT members_display_name_length CHECK (display_name IS NULL OR length(display_name) BETWEEN 1 AND 100)
);
ALTER TABLE holy.members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON holy.members FROM PUBLIC, anon, authenticated;
GRANT ALL ON holy.members TO service_role;
INSERT INTO holy.members(user_id)
SELECT user_id FROM holy.year_plans UNION SELECT user_id FROM holy.leave_entries UNION SELECT user_id FROM holy.user_settings
ON CONFLICT DO NOTHING;

CREATE FUNCTION holy.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users u JOIN holy.members m ON m.user_id = u.id
    WHERE u.id = auth.uid() AND lower(u.email) = 'michelstheo1@gmail.com' AND u.email_confirmed_at IS NOT NULL AND m.active)
$$;
CREATE FUNCTION holy.is_active_member() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM holy.members WHERE user_id = auth.uid() AND active)
$$;
CREATE FUNCTION holy.register_member() RETURNS TABLE(active boolean, is_admin boolean, display_name text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid()) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  INSERT INTO holy.members(user_id) VALUES(auth.uid()) ON CONFLICT DO NOTHING;
  RETURN QUERY SELECT m.active, holy.is_admin(), coalesce(m.display_name, split_part(u.email, '@', 1)) FROM holy.members m JOIN auth.users u ON u.id=m.user_id WHERE m.user_id=auth.uid();
END $$;
CREATE FUNCTION holy.set_display_name(value text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF NOT holy.is_active_member() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF value IS NULL OR length(btrim(value)) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid display name'; END IF;
  UPDATE holy.members SET display_name=btrim(value), updated_at=now() WHERE user_id=auth.uid();
END $$;
CREATE FUNCTION holy.admin_members() RETURNS TABLE(user_id uuid, email text, display_name text, active boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF NOT holy.is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT m.user_id, u.email::text, coalesce(m.display_name,split_part(u.email,'@',1)), m.active FROM holy.members m JOIN auth.users u ON u.id=m.user_id ORDER BY u.email;
END $$;
CREATE FUNCTION holy.admin_set_active(target uuid, enabled boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF NOT holy.is_admin() OR target=auth.uid() OR EXISTS (SELECT 1 FROM auth.users WHERE id=target AND lower(email)='michelstheo1@gmail.com' AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  UPDATE holy.members SET active=enabled, updated_at=now() WHERE user_id=target;
  IF NOT FOUND THEN RAISE EXCEPTION 'member not found'; END IF;
END $$;
REVOKE ALL ON FUNCTION holy.is_admin(), holy.is_active_member(), holy.register_member(), holy.set_display_name(text), holy.admin_members(), holy.admin_set_active(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION holy.is_admin(), holy.is_active_member(), holy.register_member(), holy.set_display_name(text), holy.admin_members(), holy.admin_set_active(uuid, boolean) TO authenticated;
DO $$ DECLARE t text; op text; BEGIN
  FOREACH t IN ARRAY ARRAY['year_plans','leave_entries','user_settings'] LOOP
    FOREACH op IN ARRAY ARRAY['select','insert','update','delete'] LOOP
      EXECUTE format('DROP POLICY %I ON holy.%I',t||'_'||op||'_policy',t);
    END LOOP;
    EXECUTE format('CREATE POLICY %I ON holy.%I FOR SELECT TO authenticated USING (auth.uid() = user_id AND holy.is_active_member())',t||'_select_policy',t);
    EXECUTE format('CREATE POLICY %I ON holy.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND holy.is_active_member())',t||'_insert_policy',t);
    EXECUTE format('CREATE POLICY %I ON holy.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id AND holy.is_active_member()) WITH CHECK (auth.uid() = user_id AND holy.is_active_member())',t||'_update_policy',t);
    EXECUTE format('CREATE POLICY %I ON holy.%I FOR DELETE TO authenticated USING (auth.uid() = user_id AND holy.is_active_member())',t||'_delete_policy',t);
  END LOOP;
END $$;
COMMIT;
