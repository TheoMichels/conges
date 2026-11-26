import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const ids = [1,2,3].map(n => `00000000-0000-4000-8000-00000000000${n}`);
const teams = [1,2,3].map(n => `00000000-0000-4000-8000-00000000001${n}`);
test('F06 : projection minimale, équipes communes et révocation immédiate', async () => {
 const db = new PGlite();
 try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
   CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   GRANT USAGE ON SCHEMA auth TO authenticated;
   INSERT INTO auth.users VALUES ('${ids[0]}','me@example.com',now()),('${ids[1]}','colleague@example.com',now()),('${ids[2]}','other@example.com',now());`);
  for (const name of ['20261017000000_holidays_multischema','20261106000000_annual_work_percentage','20261126000000_company_accounts','20261202000000_teams','20261203000000_shared_calendar']) await db.exec(readFileSync(`prisma/migrations/${name}/migration.sql`,'utf8'));
  await db.exec(`INSERT INTO holy.members(user_id,display_name) VALUES ('${ids[0]}','Moi'),('${ids[1]}','Camille'),('${ids[2]}','Autre') ON CONFLICT DO NOTHING;
   INSERT INTO holy.teams(id,name) VALUES ('${teams[0]}','Alpha'),('${teams[1]}','Beta'),('${teams[2]}','Externe');
   INSERT INTO holy.team_members VALUES ('${teams[0]}','${ids[0]}'),('${teams[0]}','${ids[1]}'),('${teams[1]}','${ids[0]}'),('${teams[1]}','${ids[1]}'),('${teams[2]}','${ids[2]}');
   INSERT INTO holy.year_plans(id,user_id,year) VALUES ('plan','${ids[1]}','2026'),('other-plan','${ids[2]}','2026');
   INSERT INTO holy.leave_entries(id,user_id,plan_id,kind,label,start_date,end_date,start_half,end_half) VALUES ('entry','${ids[1]}','plan','dates','Secret','2026-02-27','2026-03-03','afternoon','morning'),('other','${ids[2]}','other-plan','dates','Secret','2026-03-02','2026-03-02','morning','afternoon');
   SET ROLE authenticated; SET request.jwt.claim.sub='${ids[0]}';`);
  const get = async (month='2026-03-01', team=null) => (await db.query('SELECT * FROM holy.shared_calendar($1,$2)',[month,team])).rows;
  assert.equal((await db.query('SELECT * FROM holy.my_calendar_teams()')).rows.length,2);
  const rows = await get(); assert.equal(rows.length,1); assert.deepEqual(Object.keys(rows[0]).sort(),['display_name','end_date','end_half','id','start_date','start_half'].sort());
  assert.equal(rows[0].display_name,'Camille'); assert.equal((await get('2026-02-01')).length,1);
  assert.equal((await get('2026-03-01',teams[0])).length,1); assert.equal((await get('2026-03-01',teams[1])).length,1); assert.equal((await get('2026-03-01',teams[2])).length,0);
  await db.exec(`RESET ROLE; DELETE FROM holy.team_members WHERE team_id='${teams[0]}' AND user_id='${ids[0]}'; SET ROLE authenticated`);
  assert.equal((await get()).length,1); assert.equal((await get('2026-03-01',teams[0])).length,0);
  await db.exec(`RESET ROLE; UPDATE holy.teams SET archived=true WHERE id='${teams[1]}'; SET ROLE authenticated`);
  assert.equal((await get('2026-02-01')).length,0);
  await db.exec(`RESET ROLE; UPDATE holy.teams SET archived=false WHERE id='${teams[1]}'; UPDATE holy.members SET active=false WHERE user_id='${ids[1]}'; SET ROLE authenticated`);
  assert.equal((await get()).length,0);
  await db.exec(`RESET ROLE; UPDATE holy.members SET active=true WHERE user_id='${ids[1]}'; UPDATE holy.members SET active=false WHERE user_id='${ids[0]}'; SET ROLE authenticated`);
  assert.equal((await get()).length,0); assert.equal((await db.query('SELECT * FROM holy.my_calendar_teams()')).rows.length,0);
  await db.exec('RESET ROLE; SET ROLE anon'); await assert.rejects(db.query("SELECT * FROM holy.shared_calendar('2026-03-01',NULL)"),/permission denied/i);
 } finally { await db.close(); }
});
