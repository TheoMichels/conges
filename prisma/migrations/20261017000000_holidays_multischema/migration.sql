-- Migration multiSchema cible pour Holidays sur PostgreSQL Supabase partagé
-- Schéma : holidays | Auth partagée : auth.users | RLS 100% avec policies auth.uid() = user_id
BEGIN;

CREATE SCHEMA IF NOT EXISTS holidays;
GRANT USAGE ON SCHEMA holidays TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA holidays
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;

CREATE OR REPLACE FUNCTION holidays.set_updated_at() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION holidays.set_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION holidays.set_updated_at() TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 1. Table holidays.year_plans
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS holidays.year_plans (
  id TEXT NOT NULL,
  user_id UUID NOT NULL,
  year TEXT NOT NULL,
  initial_leave DECIMAL(5, 1) NOT NULL DEFAULT 26.0,
  carried_over DECIMAL(5, 1) NOT NULL DEFAULT 0.0,
  csupp DECIMAL(5, 1) NOT NULL DEFAULT 0.0,
  public_holidays DECIMAL(5, 1) NOT NULL DEFAULT 11.0,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT year_plans_pkey PRIMARY KEY (id),
  CONSTRAINT year_plans_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_year_plans_user_id ON holidays.year_plans(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_year_plans_user_year ON holidays.year_plans(user_id, year);

REVOKE ALL ON holidays.year_plans FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON holidays.year_plans TO authenticated, service_role;
ALTER TABLE holidays.year_plans ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_year_plans_updated_at ON holidays.year_plans;
CREATE TRIGGER trg_year_plans_updated_at BEFORE UPDATE ON holidays.year_plans
  FOR EACH ROW EXECUTE FUNCTION holidays.set_updated_at();

DROP POLICY IF EXISTS year_plans_select_policy ON holidays.year_plans;
CREATE POLICY year_plans_select_policy ON holidays.year_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS year_plans_insert_policy ON holidays.year_plans;
CREATE POLICY year_plans_insert_policy ON holidays.year_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS year_plans_update_policy ON holidays.year_plans;
CREATE POLICY year_plans_update_policy ON holidays.year_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS year_plans_delete_policy ON holidays.year_plans;
CREATE POLICY year_plans_delete_policy ON holidays.year_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 2. Table holidays.leave_entries
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS holidays.leave_entries (
  id TEXT NOT NULL,
  user_id UUID NOT NULL,
  plan_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  start_half TEXT,
  end_half TEXT,
  month INTEGER,
  days DECIMAL(5, 1),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT leave_entries_pkey PRIMARY KEY (id),
  CONSTRAINT leave_entries_plan_fk FOREIGN KEY (plan_id) REFERENCES holidays.year_plans(id) ON DELETE CASCADE,
  CONSTRAINT leave_entries_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_leave_entries_user_id ON holidays.leave_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_entries_plan_id ON holidays.leave_entries(plan_id);

REVOKE ALL ON holidays.leave_entries FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON holidays.leave_entries TO authenticated, service_role;
ALTER TABLE holidays.leave_entries ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_leave_entries_updated_at ON holidays.leave_entries;
CREATE TRIGGER trg_leave_entries_updated_at BEFORE UPDATE ON holidays.leave_entries
  FOR EACH ROW EXECUTE FUNCTION holidays.set_updated_at();

DROP POLICY IF EXISTS leave_entries_select_policy ON holidays.leave_entries;
CREATE POLICY leave_entries_select_policy ON holidays.leave_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS leave_entries_insert_policy ON holidays.leave_entries;
CREATE POLICY leave_entries_insert_policy ON holidays.leave_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS leave_entries_update_policy ON holidays.leave_entries;
CREATE POLICY leave_entries_update_policy ON holidays.leave_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS leave_entries_delete_policy ON holidays.leave_entries;
CREATE POLICY leave_entries_delete_policy ON holidays.leave_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 3. Table holidays.user_settings
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS holidays.user_settings (
  user_id UUID NOT NULL,
  default_initial_leave DECIMAL(5, 1) NOT NULL DEFAULT 26.0,
  country TEXT NOT NULL DEFAULT 'LU',
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_settings_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_settings_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

REVOKE ALL ON holidays.user_settings FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON holidays.user_settings TO authenticated, service_role;
ALTER TABLE holidays.user_settings ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON holidays.user_settings;
CREATE TRIGGER trg_user_settings_updated_at BEFORE UPDATE ON holidays.user_settings
  FOR EACH ROW EXECUTE FUNCTION holidays.set_updated_at();

DROP POLICY IF EXISTS user_settings_select_policy ON holidays.user_settings;
CREATE POLICY user_settings_select_policy ON holidays.user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS user_settings_insert_policy ON holidays.user_settings;
CREATE POLICY user_settings_insert_policy ON holidays.user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS user_settings_update_policy ON holidays.user_settings;
CREATE POLICY user_settings_update_policy ON holidays.user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS user_settings_delete_policy ON holidays.user_settings;
CREATE POLICY user_settings_delete_policy ON holidays.user_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);

COMMIT;
