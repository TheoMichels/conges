-- Projection minimale : les autorisations sont recalculées pour chaque appel.
CREATE FUNCTION holy.my_calendar_teams() RETURNS TABLE(id uuid, name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
 SELECT t.id, t.name FROM holy.teams t
 JOIN holy.team_members tm ON tm.team_id=t.id
 JOIN holy.members me ON me.user_id=tm.user_id AND me.active
 WHERE tm.user_id=auth.uid() AND NOT t.archived ORDER BY t.name, t.id
$$;
CREATE FUNCTION holy.shared_calendar(month_start date, selected_team uuid DEFAULT NULL)
RETURNS TABLE(id text, display_name text, start_date text, end_date text, start_half text, end_half text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
 SELECT e.id, coalesce(m.display_name, split_part(u.email, '@', 1)), e.start_date, e.end_date, e.start_half, e.end_half
 FROM holy.leave_entries e
 JOIN holy.members m ON m.user_id=e.user_id AND m.active
 JOIN auth.users u ON u.id=m.user_id
 WHERE month_start IS NOT NULL AND extract(day FROM month_start)=1
 AND e.kind='dates' AND e.start_date IS NOT NULL AND e.end_date IS NOT NULL
 AND e.start_date < (month_start + interval '1 month')::date::text AND e.end_date >= month_start::text
 AND EXISTS (SELECT 1 FROM holy.team_members mine
   JOIN holy.members me ON me.user_id=mine.user_id AND me.active
   JOIN holy.teams t ON t.id=mine.team_id AND NOT t.archived
   JOIN holy.team_members theirs ON theirs.team_id=t.id AND theirs.user_id=e.user_id
   WHERE mine.user_id=auth.uid() AND (selected_team IS NULL OR t.id=selected_team))
 ORDER BY e.start_date, e.id
$$;
REVOKE ALL ON FUNCTION holy.my_calendar_teams(), holy.shared_calendar(date,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION holy.my_calendar_teams(), holy.shared_calendar(date,uuid) TO authenticated;
