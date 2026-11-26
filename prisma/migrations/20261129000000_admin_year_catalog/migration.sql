BEGIN;
CREATE FUNCTION holy.admin_year_catalog() RETURNS TABLE(year text, has_active boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF NOT holy.is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT p.year, bool_or(p.active) FROM holy.year_plans p GROUP BY p.year ORDER BY p.year DESC;
END $$;
REVOKE ALL ON FUNCTION holy.admin_year_catalog() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION holy.admin_year_catalog() TO authenticated;
COMMIT;
