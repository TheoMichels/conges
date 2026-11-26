ALTER TABLE holy.leave_entries DROP COLUMN estimated;

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
          start_half = part->>'startHalf', end_half = part->>'endHalf', month = NULL, days = NULL
        WHERE id = original.id;
        first_part := false;
      ELSE
        INSERT INTO holy.leave_entries (id,user_id,plan_id,kind,label,start_date,end_date,start_half,end_half,created_at)
        VALUES (part->>'id',original.user_id,original.plan_id,'dates',original.label,part->>'startDate',part->>'endDate',part->>'startHalf',part->>'endHalf',original.created_at);
      END IF;
    END LOOP;
  END LOOP;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION holy.recover_monthly_leave(text,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION holy.recover_monthly_leave(text,jsonb,jsonb) TO authenticated;
