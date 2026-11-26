BEGIN;
ALTER TABLE holy.year_plans ADD COLUMN active boolean NOT NULL DEFAULT true;
ALTER TABLE holy.year_plans ALTER COLUMN initial_leave TYPE numeric(6,2), ALTER COLUMN csupp TYPE numeric(6,2), ALTER COLUMN holiday_override TYPE numeric(6,2);
ALTER TABLE holy.year_plans ADD CONSTRAINT annual_rights_nonnegative CHECK (initial_leave >= 0 AND csupp >= 0 AND (holiday_override IS NULL OR holiday_override >= 0));
DROP POLICY year_plans_select_policy ON holy.year_plans;
DROP POLICY year_plans_insert_policy ON holy.year_plans;
DROP POLICY year_plans_update_policy ON holy.year_plans;
DROP POLICY year_plans_delete_policy ON holy.year_plans;
REVOKE INSERT, UPDATE, DELETE ON holy.year_plans FROM authenticated;
CREATE POLICY year_plans_select_policy ON holy.year_plans FOR SELECT TO authenticated USING (auth.uid()=user_id AND holy.is_active_member() AND active);
DROP POLICY leave_entries_select_policy ON holy.leave_entries;
DROP POLICY leave_entries_insert_policy ON holy.leave_entries;
DROP POLICY leave_entries_update_policy ON holy.leave_entries;
DROP POLICY leave_entries_delete_policy ON holy.leave_entries;
CREATE FUNCTION holy.can_write_entry(owner uuid, plan text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
 SELECT owner=auth.uid() AND holy.is_active_member() AND EXISTS (SELECT 1 FROM holy.year_plans p WHERE p.id=plan AND p.user_id=owner AND p.active)
$$;
REVOKE ALL ON FUNCTION holy.can_write_entry(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION holy.can_write_entry(uuid,text) TO authenticated;
CREATE POLICY leave_entries_select_policy ON holy.leave_entries FOR SELECT TO authenticated USING (holy.can_write_entry(user_id,plan_id));
CREATE POLICY leave_entries_insert_policy ON holy.leave_entries FOR INSERT TO authenticated WITH CHECK (holy.can_write_entry(user_id,plan_id));
CREATE POLICY leave_entries_update_policy ON holy.leave_entries FOR UPDATE TO authenticated USING (holy.can_write_entry(user_id,plan_id)) WITH CHECK (holy.can_write_entry(user_id,plan_id));
CREATE POLICY leave_entries_delete_policy ON holy.leave_entries FOR DELETE TO authenticated USING (holy.can_write_entry(user_id,plan_id));

-- Calendar logic mirrors the Luxembourg holiday and working-day rules used by the client.
CREATE FUNCTION holy.holiday_dates(y integer) RETURNS date[] LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog AS $$
DECLARE a integer; b integer; c integer; h integer; l integer; m integer; easter date; result date[];
BEGIN
 a:=y%19; b:=y/100; c:=y%100; h:=(19*a+b-b/4-((b-((b+8)/25)+1)/3)+15)%30;
 l:=(32+2*(b%4)+2*(c/4)-h-(c%4))%7; m:=(a+11*h+22*l)/451;
 easter:=make_date(y,(h+l-7*m+114)/31,(h+l-7*m+114)%31+1);
 result:=ARRAY[make_date(y,1,1),easter+1,make_date(y,5,1),easter+39,easter+50,make_date(y,6,23),make_date(y,8,15),make_date(y,11,1),make_date(y,12,25),make_date(y,12,26)];
 IF y>=2019 THEN result:=array_append(result,make_date(y,5,9)); END IF; RETURN result;
END $$;
CREATE FUNCTION holy.automatic_holidays(y integer) RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
 SELECT count(*) FILTER (WHERE extract(dow FROM d) IN (0,6)) + count(*) - count(DISTINCT d) FROM unnest(holy.holiday_dates(y)) d
$$;
CREATE FUNCTION holy.entry_days(k text, s text, e text, sh text, eh text, monthly numeric) RETURNS numeric LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog AS $$
DECLARE d date; first_day date; last_day date; total numeric:=0;
BEGIN
 IF k='month' THEN RETURN coalesce(monthly,0); END IF;
 BEGIN first_day:=s::date; last_day:=e::date; EXCEPTION WHEN OTHERS THEN RETURN 0; END;
 IF first_day IS NULL OR last_day IS NULL OR last_day<first_day THEN RETURN 0; END IF;
 IF first_day=last_day AND sh='afternoon' AND eh='morning' THEN RETURN 0; END IF;
 FOR d IN SELECT generate_series(first_day,last_day,'1 day'::interval)::date LOOP
   IF extract(dow FROM d) NOT IN (0,6) AND NOT d=ANY(holy.holiday_dates(extract(year FROM d)::int)) THEN
     IF (d=first_day AND sh='afternoon') OR (d=last_day AND eh='morning') THEN total:=total+0.5; ELSE total:=total+1; END IF;
   END IF;
 END LOOP; RETURN total;
END $$;
CREATE FUNCTION holy.plan_taken(pid text) RETURNS numeric LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
 SELECT coalesce(sum(holy.entry_days(kind,start_date,end_date,start_half,end_half,days)),0) FROM holy.leave_entries WHERE plan_id=pid
$$;
CREATE FUNCTION holy.admin_save_year(target uuid, target_year text, initial numeric, carried numeric, supplementary numeric, holiday numeric, activate boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
 IF NOT holy.is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF target_year !~ '^[0-9]{4}$' OR target_year::int NOT BETWEEN 1900 AND 2100 OR initial IS NULL OR carried IS NULL OR supplementary IS NULL OR activate IS NULL OR initial<0 OR supplementary<0 OR holiday<0 OR round(initial,2)<>initial OR round(carried,2)<>carried OR round(supplementary,2)<>supplementary OR round(holiday,2)<>holiday OR NOT EXISTS (SELECT 1 FROM holy.members WHERE user_id=target) THEN RAISE EXCEPTION 'invalid annual rights'; END IF;
 INSERT INTO holy.year_plans(id,user_id,year,initial_leave,carried_over,csupp,holiday_override,public_holidays,active)
 VALUES (md5(random()::text || clock_timestamp()::text),target,target_year,initial,carried,supplementary,holiday,holy.automatic_holidays(target_year::int),activate)
 ON CONFLICT (user_id,year) DO UPDATE SET initial_leave=excluded.initial_leave,carried_over=excluded.carried_over,csupp=excluded.csupp,holiday_override=excluded.holiday_override,active=holy.year_plans.active OR excluded.active;
END $$;
CREATE FUNCTION holy.admin_years(target_year text) RETURNS TABLE(user_id uuid, email text, display_name text, active boolean, plan_id text, year_active boolean, initial_leave numeric, carried_over numeric, csupp numeric, holiday_override numeric, automatic_holidays numeric, taken numeric, remaining numeric, suggested_carry numeric) LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
 IF NOT holy.is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF target_year !~ '^[0-9]{4}$' OR target_year::int NOT BETWEEN 1900 AND 2100 THEN RAISE EXCEPTION 'invalid year'; END IF;
 RETURN QUERY SELECT m.user_id,u.email::text,coalesce(m.display_name,split_part(u.email,'@',1)),m.active,p.id,p.active,p.initial_leave,p.carried_over,p.csupp,p.holiday_override,holy.automatic_holidays(target_year::int),coalesce(holy.plan_taken(p.id),0),
 p.initial_leave+p.carried_over+p.csupp+coalesce(p.holiday_override,holy.automatic_holidays(target_year::int))-coalesce(holy.plan_taken(p.id),0),
 coalesce(prev.initial_leave+prev.carried_over+prev.csupp+coalesce(prev.holiday_override,holy.automatic_holidays(prev.year::int))-holy.plan_taken(prev.id),0)
 FROM holy.members m JOIN auth.users u ON u.id=m.user_id LEFT JOIN holy.year_plans p ON p.user_id=m.user_id AND p.year=target_year LEFT JOIN holy.year_plans prev ON prev.user_id=m.user_id AND prev.year=(target_year::int-1)::text ORDER BY u.email;
END $$;
REVOKE ALL ON FUNCTION holy.holiday_dates(integer), holy.automatic_holidays(integer), holy.entry_days(text,text,text,text,text,numeric), holy.plan_taken(text), holy.admin_save_year(uuid,text,numeric,numeric,numeric,numeric,boolean), holy.admin_years(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION holy.admin_save_year(uuid,text,numeric,numeric,numeric,numeric,boolean), holy.admin_years(text) TO authenticated;
COMMIT;
