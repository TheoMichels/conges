import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const admin = "00000000-0000-4000-8000-000000000001";
const member = "00000000-0000-4000-8000-000000000002";
const other = "00000000-0000-4000-8000-000000000003";
const migrations = ["20261017000000_holidays_multischema", "20261106000000_annual_work_percentage", "20261126000000_company_accounts", "20261127000000_remove_work_percentage", "20261128000000_annual_entitlements"];

test("F03: reprise, activation et autorisations en base isolée", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated;
      INSERT INTO auth.users VALUES ('${admin}','michelstheo1@gmail.com',now()),('${member}','member@example.com',now()),('${other}','other@example.com',now());`);
    for (const name of migrations.slice(0, 4)) await db.exec(readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8"));
    await db.exec(`INSERT INTO holy.members(user_id) VALUES ('${admin}'),('${member}'),('${other}') ON CONFLICT DO NOTHING;
      INSERT INTO holy.year_plans(id,user_id,year) VALUES ('old','${member}','2023');`);
    await db.exec(readFileSync(`prisma/migrations/${migrations[4]}/migration.sql`, "utf8"));
    assert.equal(Number((await db.query("SELECT holy.entry_days('dates','2024-05-08','2024-05-10','afternoon','afternoon',NULL) AS days")).rows[0].days), 1.5);
    await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub='${member}'`);
    assert.equal((await db.query("SELECT id FROM holy.year_plans")).rows[0].id, "old");
    await assert.rejects(db.query(`SELECT holy.admin_save_year('${member}','2024',26,2,1,NULL,false)`), /forbidden/i);
    await assert.rejects(db.query(`INSERT INTO holy.year_plans(id,user_id,year) VALUES ('illicit','${member}','2028')`), /permission denied|row-level security/i);
    await db.exec(`SET request.jwt.claim.sub='${admin}'`);
    await db.query(`SELECT holy.admin_save_year('${member}','2024',26,2,1,NULL,false)`);
    await db.exec(`SET request.jwt.claim.sub='${member}'`);
    assert.equal((await db.query("SELECT id FROM holy.year_plans WHERE year='2024'")).rows.length, 0);
    await db.exec(`SET request.jwt.claim.sub='${admin}'`);
    await db.query(`SELECT holy.admin_save_year('${member}','2024',26,2,1,NULL,true)`);
    await db.exec(`SET request.jwt.claim.sub='${member}'`);
    const active = (await db.query("SELECT id FROM holy.year_plans WHERE year='2024'")).rows[0].id;
    await db.query(`INSERT INTO holy.leave_entries(id,user_id,plan_id,kind,label,month,days) VALUES ('leave','${member}',$1,'month','privé',0,1.5)`, [active]);
    await assert.rejects(db.query(`UPDATE holy.year_plans SET initial_leave=999 WHERE id=$1`, [active]), /permission denied/i);
    await db.exec(`SET request.jwt.claim.sub='${other}'`);
    await assert.rejects(db.query(`INSERT INTO holy.leave_entries(id,user_id,plan_id,kind,label,month,days) VALUES ('intrusion','${other}',$1,'month','x',0,1)`, [active]), /row-level security/i);
    await db.exec(`SET request.jwt.claim.sub='${admin}'`);
    const aggregate = (await db.query(`SELECT * FROM holy.admin_years('2024')`)).rows.find(row => row.user_id === member);
    assert.equal(Number(aggregate.taken), 1.5);
    assert.equal(Number(aggregate.remaining), 29.5);
    assert.equal(JSON.stringify(aggregate).includes('privé'), false);
    await db.query(`SELECT holy.admin_save_year('${member}','2024',26,2,1,0,true)`);
    assert.equal(Number((await db.query(`SELECT * FROM holy.admin_years('2024')`)).rows.find(row => row.user_id === member).remaining), 27.5);
    await db.query(`SELECT holy.admin_save_year('${member}','2024',26,2,1,NULL,true)`);
    assert.equal(Number((await db.query(`SELECT * FROM holy.admin_years('2024')`)).rows.find(row => row.user_id === member).remaining), 29.5);
    await db.query(`SELECT holy.admin_save_year('${member}','2023',50,0,0,NULL,true)`);
    assert.equal(Number((await db.query(`SELECT * FROM holy.admin_years('2024')`)).rows.find(row => row.user_id === member).carried_over), 2);
    await db.query(`SELECT holy.admin_save_year('${member}','2024',30,2,1,NULL,true)`);
    await db.exec(`SET request.jwt.claim.sub='${member}'`);
    await db.query(`UPDATE holy.leave_entries SET days=2 WHERE id='leave'`);
    assert.equal(Number((await db.query(`SELECT initial_leave FROM holy.year_plans WHERE id=$1`, [active])).rows[0].initial_leave), 30);
    await db.exec(`RESET ROLE; UPDATE holy.members SET active=false WHERE user_id='${member}'; SET ROLE authenticated; SET request.jwt.claim.sub='${member}'`);
    await assert.rejects(db.query(`INSERT INTO holy.leave_entries(id,user_id,plan_id,kind,label,month,days) VALUES ('disabled','${member}',$1,'month','x',0,1)`, [active]), /row-level security/i);
  } finally { await db.close(); }
});
