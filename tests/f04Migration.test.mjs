import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const user = '00000000-0000-4000-8000-000000000001';
test('F04 migration validates dates and atomically recovers a snapshot once', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated; INSERT INTO auth.users VALUES ('${user}');`);
    await db.exec(readFileSync('prisma/migrations/20261017000000_holidays_multischema/migration.sql','utf8'));
    await db.exec(`INSERT INTO holy.year_plans(id,user_id,year) VALUES ('p','${user}','2026');
      INSERT INTO holy.leave_entries(id,user_id,plan_id,kind,label,month,days) VALUES ('old','${user}','p','month','Vacances',1,1.5);`);
    await db.exec(readFileSync('prisma/migrations/20261130000000_dated_leave/migration.sql','utf8'));
    await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${user}',false);`);
    await assert.rejects(db.exec(`INSERT INTO holy.leave_entries(id,user_id,plan_id,kind,label,month,days) VALUES ('bad','${user}','p','month','Bad',1,1)`));
    await assert.rejects(db.exec(`INSERT INTO holy.leave_entries(id,user_id,plan_id,kind,label,start_date,end_date) VALUES ('bad','${user}','p','dates','Bad','2026-02-30','2026-02-30')`));
    const snapshot = (await db.query(`SELECT id,updated_at FROM holy.leave_entries WHERE plan_id='p'`)).rows;
    const parts = [{id:'old',startDate:'2026-02-02',endDate:'2026-02-03',startHalf:'afternoon',endHalf:'afternoon'}];
    const params = ['p', JSON.stringify(snapshot), JSON.stringify([{id:'old',parts}])];
    assert.equal((await db.query('SELECT holy.recover_monthly_leave($1,$2::jsonb,$3::jsonb) AS applied',params)).rows[0].applied,true);
    assert.equal((await db.query('SELECT holy.recover_monthly_leave($1,$2::jsonb,$3::jsonb) AS applied',params)).rows[0].applied,false);
    const rows = (await db.query('SELECT id,kind,estimated,start_date,end_date FROM holy.leave_entries')).rows;
    assert.deepEqual(rows,[{id:'old',kind:'dates',estimated:true,start_date:'2026-02-02',end_date:'2026-02-03'}]);
  } finally { await db.close(); }
});

test('F04 recovery respects active-member RLS and keeps annual rights independent', async () => {
  const db = new PGlite();
  const other = '00000000-0000-4000-8000-000000000002';
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated;
      INSERT INTO auth.users VALUES ('${user}','member@example.com',now()),('${other}','other@example.com',now());`);
    for (const name of ['20261017000000_holidays_multischema','20261106000000_annual_work_percentage','20261126000000_company_accounts','20261127000000_remove_work_percentage'])
      await db.exec(readFileSync(`prisma/migrations/${name}/migration.sql`,'utf8'));
    await db.exec(`INSERT INTO holy.members(user_id) VALUES ('${user}'),('${other}') ON CONFLICT DO NOTHING;
      INSERT INTO holy.year_plans(id,user_id,year,initial_leave) VALUES ('p','${user}','2026',26);
      INSERT INTO holy.leave_entries(id,user_id,plan_id,kind,label,month,days) VALUES ('old','${user}','p','month','Vacances',1,1.5);`);
    for (const name of ['20261128000000_annual_entitlements','20261129000000_admin_year_catalog','20261130000000_dated_leave'])
      await db.exec(readFileSync(`prisma/migrations/${name}/migration.sql`,'utf8'));
    await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub='${other}'`);
    await assert.rejects(db.query("SELECT holy.recover_monthly_leave('p','[]'::jsonb,'[]'::jsonb)"), /Plan indisponible/);
    await db.exec(`SET request.jwt.claim.sub='${user}'`);
    const snapshot = (await db.query("SELECT id,updated_at FROM holy.leave_entries WHERE plan_id='p'")).rows;
    const replacements = [{id:'old',parts:[{id:'old',startDate:'2026-02-02',endDate:'2026-02-03',startHalf:'morning',endHalf:'morning'}]}];
    assert.equal((await db.query('SELECT holy.recover_monthly_leave($1,$2::jsonb,$3::jsonb) AS applied',['p',JSON.stringify(snapshot),JSON.stringify(replacements)])).rows[0].applied,true);
    await db.exec("RESET ROLE");
    const result = (await db.query("SELECT initial_leave,holy.plan_taken(id) AS taken FROM holy.year_plans WHERE id='p'")).rows[0];
    assert.equal(Number(result.initial_leave),26); assert.equal(Number(result.taken),1.5);
  } finally { await db.close(); }
});
