import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const admin = '00000000-0000-4000-8000-000000000001';
const member = '00000000-0000-4000-8000-000000000002';
const other = '00000000-0000-4000-8000-000000000003';
const newer = '00000000-0000-4000-8000-000000000004';
const migrations = ['20261017000000_holidays_multischema', '20261106000000_annual_work_percentage', '20261126000000_company_accounts'];

test('F01: migration, inscription, identité vérifiée et désactivation contrôlent les accès en base', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated;
      INSERT INTO auth.users VALUES ('${admin}','michelstheo1@gmail.com',now()), ('${member}','member@example.com',now()), ('${other}','other@example.com',now()), ('${newer}','new@example.com',now());`);
    for (const name of migrations.slice(0, 2)) await db.exec(readFileSync(`prisma/migrations/${name}/migration.sql`, 'utf8'));
    await db.exec(`INSERT INTO holy.year_plans(id,user_id,year) VALUES ('old','${member}','2026')`);
    await db.exec(readFileSync(`prisma/migrations/${migrations[2]}/migration.sql`, 'utf8'));
    assert.deepEqual((await db.query('SELECT user_id FROM holy.members')).rows.map(x => x.user_id), [member]);
    await db.exec(`UPDATE auth.users SET email_confirmed_at=NULL WHERE id='${admin}'; SET ROLE authenticated; SET request.jwt.claim.sub='${admin}'`);
    await db.query('SELECT * FROM holy.register_member()');
    await assert.rejects(db.query('SELECT * FROM holy.admin_members()'), /forbidden/i);
    await db.exec(`RESET ROLE; UPDATE auth.users SET email_confirmed_at=now() WHERE id='${admin}'; SET ROLE authenticated; SET request.jwt.claim.sub='${newer}'`);
    const registered = (await db.query('SELECT * FROM holy.register_member()')).rows[0];
    assert.equal(registered.display_name, 'new');
    await db.query('SELECT * FROM holy.register_member()');
    await assert.rejects(db.query('SELECT * FROM holy.members'), /permission denied/i);
    await assert.rejects(db.query('SELECT email FROM auth.users'), /permission denied/i);
    await assert.rejects(db.query('SELECT * FROM holy.admin_members()'), /forbidden/i);
    await db.exec(`SET request.jwt.claim.sub='${member}'`);
    await db.query("SELECT holy.set_display_name('michelstheo1@gmail.com')");
    await assert.rejects(db.query('SELECT * FROM holy.admin_members()'), /forbidden/i);
    await db.exec(`SET request.jwt.claim.sub='${admin}'`);
    await db.query('SELECT * FROM holy.register_member()');
    let list = (await db.query('SELECT * FROM holy.admin_members()')).rows;
    assert.equal(list.length, 3);
    assert.equal(list.some(x => x.user_id === other), false);
    await db.query(`SELECT holy.admin_set_active('${member}', false)`);
    await assert.rejects(db.query(`SELECT holy.admin_set_active('${admin}', false)`), /forbidden/i);
    await db.exec(`SET request.jwt.claim.sub='${member}'`);
    assert.equal((await db.query('SELECT * FROM holy.year_plans')).rows.length, 0);
    assert.equal((await db.query('SELECT * FROM holy.register_member()')).rows[0].active, false);
    await assert.rejects(db.query(`INSERT INTO holy.year_plans(id,user_id,year) VALUES ('blocked','${member}','2027')`), /row-level security/i);
    await db.exec(`SET request.jwt.claim.sub='${admin}'`);
    list = (await db.query('SELECT * FROM holy.admin_members()')).rows;
    assert.equal(list.find(x => x.user_id === member).active, false);
    await db.query(`SELECT holy.admin_set_active('${member}', true)`);
    await db.exec(`SET request.jwt.claim.sub='${member}'`);
    assert.equal((await db.query('SELECT * FROM holy.year_plans')).rows.length, 1);
  } finally { await db.close(); }
});
