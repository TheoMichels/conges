import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const admin = "00000000-0000-4000-8000-000000000001";
const member = "00000000-0000-4000-8000-000000000002";
test("F05: unicité, affectations, archives et autorisations en base isolée", async () => {
 const db = new PGlite();
 try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
   CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   GRANT USAGE ON SCHEMA auth TO authenticated;
   INSERT INTO auth.users VALUES ('${admin}','michelstheo1@gmail.com',now()),('${member}','member@example.com',now());`);
  for (const name of ["20261017000000_holidays_multischema", "20261106000000_annual_work_percentage", "20261126000000_company_accounts", "20261202000000_teams"]) await db.exec(readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8"));
  await db.exec(`INSERT INTO holy.members(user_id) VALUES ('${admin}'),('${member}') ON CONFLICT DO NOTHING; SET ROLE authenticated; SET request.jwt.claim.sub='${admin}'`);
  const a = (await db.query("SELECT holy.admin_save_team(NULL, ' Alpha ') AS id")).rows[0].id;
  const b = (await db.query("SELECT holy.admin_save_team(NULL, 'Beta') AS id")).rows[0].id;
  await assert.rejects(db.query("SELECT holy.admin_save_team(NULL, ' alpha ' )"), /unique|duplicate/i);
  await db.query("SELECT holy.admin_set_team_member($1,$2,true)", [a,member]);
  await db.query("SELECT holy.admin_set_team_member($1,$2,true)", [a,member]);
  await db.query("SELECT holy.admin_set_team_member($1,$2,true)", [b,member]);
  assert.equal((await db.query("SELECT * FROM holy.admin_team_members()" )).rows.length, 2);
  await db.query("SELECT holy.admin_save_team($1,'Renommée')", [a]);
  await db.query("SELECT holy.admin_set_team_member($1,$2,false)", [b,member]);
  await db.query("SELECT holy.admin_archive_team($1)", [a]);
  assert.deepEqual((await db.query("SELECT name, archived FROM holy.admin_teams() ORDER BY name")).rows, [{name:'Beta',archived:false},{name:'Renommée',archived:true}]);
  assert.equal((await db.query("SELECT * FROM holy.admin_team_members()")).rows.length, 1);
  await assert.rejects(db.query("SELECT holy.admin_set_team_member($1,$2,true)", [a,member]), /invalid/i);
  await db.exec(`SET request.jwt.claim.sub='${member}'`);
  for (const q of ["SELECT * FROM holy.admin_teams()", "SELECT * FROM holy.admin_team_members()", "SELECT holy.admin_save_team(NULL,'intrusion')", `SELECT holy.admin_archive_team('${a}')`, `SELECT holy.admin_set_team_member('${b}','${member}',true)`, "SELECT * FROM holy.teams", "SELECT * FROM holy.team_members"]) await assert.rejects(db.query(q), /forbidden|permission denied/i);
 } finally { await db.close(); }
});
