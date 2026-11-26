ALTER TABLE holy.leave_entries ADD COLUMN IF NOT EXISTS estimated boolean NOT NULL DEFAULT false;

-- Serialize all entry mutations for a plan with recovery; the owner/RLS still applies.
CREATE OR REPLACE FUNCTION holy.validate_dated_leave() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, holy AS $$
DECLARE start_value date; end_value date;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(COALESCE(NEW.plan_id, OLD.plan_id), 0));
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF NEW.kind <> 'dates' THEN
    RAISE EXCEPTION 'Une saisie de congé doit comporter des dates valides';
  END IF;
  BEGIN
    IF NEW.start_date !~ '^\d{4}-\d{2}-\d{2}$' OR NEW.end_date !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'invalid date'; END IF;
    start_value := NEW.start_date::date;
    end_value := NEW.end_date::date;
    IF start_value IS NULL OR end_value IS NULL OR end_value < start_value OR
       (NEW.start_date = NEW.end_date AND NEW.start_half = 'afternoon' AND NEW.end_half = 'morning') OR
       (NEW.start_half IS NOT NULL AND NEW.start_half NOT IN ('morning','afternoon')) OR
       (NEW.end_half IS NOT NULL AND NEW.end_half NOT IN ('morning','afternoon')) THEN RAISE EXCEPTION 'invalid date'; END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Une saisie de congé doit comporter des dates valides';
  END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_dated_leave ON holy.leave_entries;
CREATE TRIGGER validate_dated_leave BEFORE INSERT OR UPDATE OR DELETE ON holy.leave_entries
FOR EACH ROW EXECUTE FUNCTION holy.validate_dated_leave();

-- Compare the entire snapshot under the same plan lock, then replace each historic
-- entry in one transaction. A stale client cannot overwrite a concurrent change.
CREATE OR REPLACE FUNCTION holy.recover_monthly_leave(p_plan_id text, p_snapshot jsonb, p_replacements jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, holy AS $$
DECLARE item jsonb; part jsonb; original holy.leave_entries%ROWTYPE; first_part boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_plan_id, 0));
  PERFORM 1 FROM holy.year_plans WHERE id = p_plan_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan indisponible'; END IF;
  IF jsonb_typeof(p_snapshot) <> 'array' OR jsonb_typeof(p_replacements) <> 'array' THEN RAISE EXCEPTION 'Reprise invalide'; END IF;
  IF (SELECT count(*) FROM holy.leave_entries WHERE plan_id = p_plan_id AND user_id = auth.uid()) <> jsonb_array_length(p_snapshot)
     OR EXISTS (SELECT 1 FROM jsonb_array_elements(p_snapshot) s WHERE NOT EXISTS (
       SELECT 1 FROM holy.leave_entries e WHERE e.plan_id = p_plan_id AND e.user_id = auth.uid()
         AND e.id = s->>'id' AND e.updated_at = (s->>'updated_at')::timestamptz)) THEN RETURN false; END IF;
  FOR item IN SELECT * FROM jsonb_array_elements(p_replacements) LOOP
    SELECT * INTO original FROM holy.leave_entries WHERE id = item->>'id' AND plan_id = p_plan_id AND user_id = auth.uid() AND kind = 'month' FOR UPDATE;
    IF NOT FOUND OR jsonb_typeof(item->'parts') <> 'array' OR jsonb_array_length(item->'parts') = 0 THEN RAISE EXCEPTION 'Reprise invalide'; END IF;
    first_part := true;
    FOR part IN SELECT * FROM jsonb_array_elements(item->'parts') LOOP
      IF first_part THEN
        IF part->>'id' <> original.id THEN RAISE EXCEPTION 'Reprise invalide'; END IF;
        UPDATE holy.leave_entries SET kind = 'dates', start_date = part->>'startDate', end_date = part->>'endDate',
          start_half = part->>'startHalf', end_half = part->>'endHalf', month = NULL, days = NULL, estimated = true
        WHERE id = original.id;
        first_part := false;
      ELSE
        INSERT INTO holy.leave_entries (id,user_id,plan_id,kind,label,start_date,end_date,start_half,end_half,estimated,created_at)
        VALUES (part->>'id',original.user_id,original.plan_id,'dates',original.label,part->>'startDate',part->>'endDate',part->>'startHalf',part->>'endHalf',true,original.created_at);
      END IF;
    END LOOP;
  END LOOP;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION holy.recover_monthly_leave(text,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION holy.recover_monthly_leave(text,jsonb,jsonb) TO authenticated;
