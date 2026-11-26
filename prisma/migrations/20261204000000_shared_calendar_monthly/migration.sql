-- Same per-call team authorization as the original projection; no labels or balances.
DROP FUNCTION holy.shared_calendar(date, uuid);
CREATE FUNCTION holy.shared_calendar(month_start date, selected_team uuid DEFAULT NULL)
RETURNS TABLE(id text, display_name text, member_key text, kind text, start_date text, end_date text, start_half text, end_half text, month integer, days numeric, created_at timestamptz, reserved_ids text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
 SELECT e.id, coalesce(m.display_name, split_part(u.email, '@', 1)), md5(e.user_id::text), e.kind,
   e.start_date, e.end_date, e.start_half, e.end_half, e.month, e.days, e.created_at,
   CASE WHEN e.kind='month' THEN ARRAY(SELECT other.id FROM holy.leave_entries other
     WHERE other.plan_id=e.plan_id AND left(other.id, length(e.id) + 11)=e.id || '~recovered~') ELSE ARRAY[]::text[] END
 FROM holy.leave_entries e
 JOIN holy.year_plans p ON p.id=e.plan_id AND p.user_id=e.user_id
 JOIN holy.members m ON m.user_id=e.user_id AND m.active
 JOIN auth.users u ON u.id=m.user_id
 WHERE month_start IS NOT NULL AND extract(day FROM month_start)=1
 AND ((e.kind='dates' AND e.start_date IS NOT NULL AND e.end_date IS NOT NULL
   AND e.start_date < (month_start + interval '1 month')::date::text AND e.end_date >= month_start::text)
   OR (e.kind='month' AND p.year=extract(year FROM month_start)::integer::text AND e.month=extract(month FROM month_start)::integer-1))
 AND EXISTS (SELECT 1 FROM holy.team_members mine
   JOIN holy.members me ON me.user_id=mine.user_id AND me.active
   JOIN holy.teams t ON t.id=mine.team_id AND NOT t.archived
   JOIN holy.team_members theirs ON theirs.team_id=t.id AND theirs.user_id=e.user_id
   WHERE mine.user_id=auth.uid() AND (selected_team IS NULL OR t.id=selected_team))
 ORDER BY e.created_at, e.id
$$;
REVOKE ALL ON FUNCTION holy.shared_calendar(date,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION holy.shared_calendar(date,uuid) TO authenticated;
