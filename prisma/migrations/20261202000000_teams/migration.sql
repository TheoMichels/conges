CREATE TABLE holy.teams (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100 AND name=btrim(name)), archived boolean NOT NULL DEFAULT false);
CREATE UNIQUE INDEX teams_active_name_unique ON holy.teams (lower(btrim(name))) WHERE NOT archived;
CREATE TABLE holy.team_members (team_id uuid NOT NULL REFERENCES holy.teams(id), user_id uuid NOT NULL REFERENCES holy.members(user_id), PRIMARY KEY(team_id,user_id));
ALTER TABLE holy.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE holy.team_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON holy.teams, holy.team_members FROM PUBLIC, anon, authenticated;
GRANT ALL ON holy.teams, holy.team_members TO service_role;
CREATE FUNCTION holy.admin_teams() RETURNS TABLE(id uuid, name text, archived boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN IF NOT holy.is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT t.id,t.name,t.archived FROM holy.teams t ORDER BY t.name; END $$;
CREATE FUNCTION holy.admin_team_members() RETURNS TABLE(team_id uuid, user_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN IF NOT holy.is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT tm.team_id,tm.user_id FROM holy.team_members tm; END $$;
CREATE FUNCTION holy.admin_save_team(target uuid, value text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result uuid;
BEGIN IF NOT holy.is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF value IS NULL OR length(btrim(value)) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid name'; END IF;
 IF target IS NULL THEN INSERT INTO holy.teams(name) VALUES (btrim(value)) RETURNING id INTO result;
 ELSE UPDATE holy.teams SET name=btrim(value) WHERE id=target AND NOT archived RETURNING id INTO result; IF result IS NULL THEN RAISE EXCEPTION 'invalid team'; END IF; END IF;
 RETURN result; END $$;
CREATE FUNCTION holy.admin_archive_team(target uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN IF NOT holy.is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 UPDATE holy.teams SET archived=true WHERE id=target AND NOT archived; IF NOT FOUND THEN RAISE EXCEPTION 'invalid team'; END IF; END $$;
CREATE FUNCTION holy.admin_set_team_member(target uuid, member uuid, assigned boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN IF NOT holy.is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM holy.teams WHERE id=target AND NOT archived FOR UPDATE;
 IF NOT FOUND OR assigned IS NULL OR NOT EXISTS (SELECT 1 FROM holy.members WHERE user_id=member) THEN RAISE EXCEPTION 'invalid assignment'; END IF;
 IF assigned THEN INSERT INTO holy.team_members(team_id,user_id) VALUES(target,member) ON CONFLICT DO NOTHING;
 ELSE DELETE FROM holy.team_members WHERE team_id=target AND user_id=member; END IF; END $$;
REVOKE ALL ON FUNCTION holy.admin_teams(), holy.admin_team_members(), holy.admin_save_team(uuid,text), holy.admin_archive_team(uuid), holy.admin_set_team_member(uuid,uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION holy.admin_teams(), holy.admin_team_members(), holy.admin_save_team(uuid,text), holy.admin_archive_team(uuid), holy.admin_set_team_member(uuid,uuid,boolean) TO authenticated;
