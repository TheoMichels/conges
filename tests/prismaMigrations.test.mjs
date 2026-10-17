import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { deployDatabase } from '../scripts/deploy-db.mjs';

const rootDir = process.cwd();
const migrationFile = 'prisma/migrations/20261017000000_holidays_multischema/migration.sql';
const tables = ['year_plans', 'leave_entries', 'user_settings'];
const userA = '00000000-0000-4000-8000-000000000001';
const userB = '00000000-0000-4000-8000-000000000002';
const missingUser = '00000000-0000-4000-8000-000000000003';

async function database() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    INSERT INTO auth.users VALUES ('${userA}'), ('${userB}');
  `);
  return db;
}

test('AC-01 / AC-02: prisma/schema.prisma est configuré en multiSchema (holidays, auth) avec les modèles canoniques', () => {
  const schemaPath = path.join(rootDir, 'prisma', 'schema.prisma');
  assert.ok(existsSync(schemaPath), 'prisma/schema.prisma doit exister');

  const content = readFileSync(schemaPath, 'utf8');
  assert.match(content, /schemas\s*=\s*\["holidays",\s*"auth"\]/);
  assert.match(content, /previewFeatures\s*=\s*\["multiSchema"\]/);
  assert.match(content, /url\s*=\s*env\("DATABASE_URL"\)/);
  assert.match(content, /directUrl\s*=\s*env\("DIRECT_URL"\)/);

  for (const table of tables) {
    assert.match(content, new RegExp(`@@map\\("${table}"\\)`));
  }
  assert.match(content, /@@schema\("holidays"\)/);
  assert.match(content, /@map\("user_id"\)/);
  assert.match(content, /@map\("created_at"\)/);
  assert.match(content, /@map\("updated_at"\)/);
  assert.match(content, /@@index\(\[userId\],\s*map:\s*"idx_year_plans_user_id"\)/);
  assert.match(content, /@@unique\(\[userId,\s*year\],\s*map:\s*"idx_year_plans_user_year"\)/);
  assert.match(content, /@@index\(\[userId\],\s*map:\s*"idx_leave_entries_user_id"\)/);
  assert.match(content, /@@index\(\[planId\],\s*map:\s*"idx_leave_entries_plan_id"\)/);
});

test('AC-03: deployDatabase runner n’exécute que prisma migrate deploy avec DIRECT_URL et refuse db push', () => {
  const calls = [];
  const run = (...args) => {
    calls.push(args);
    return { status: 0 };
  };
  const env = {
    DIRECT_URL: 'postgresql://direct.invalid/db',
    DATABASE_URL: 'postgresql://pool.invalid/db',
  };

  assert.equal(deployDatabase(env, run), 0);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][1], ['migrate', 'deploy']);
  assert.equal(calls[0][2].env.DATABASE_URL, env.DIRECT_URL);
  assert.equal(calls[0][2].env.DIRECT_URL, env.DIRECT_URL);
  assert.equal(calls[0][2].shell, false);

  assert.equal(deployDatabase({ POSTGRES_URL_NON_POOLING: env.DIRECT_URL }, run), 0);
  assert.throws(() => deployDatabase({}, run), /DIRECT_URL/);
  assert.equal(deployDatabase(env, () => ({ status: 42 })), 42);
  assert.throws(
    () => deployDatabase(env, () => ({ error: new Error('spawn failed') })),
    /spawn failed/
  );

  const pkg = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['db:push'], undefined, 'prisma db push ne doit pas être exposé en script');
  assert.equal(pkg.scripts['db:deploy'], 'node scripts/deploy-db.mjs');
});

test('AC-02 / AC-04: la migration SQL multischema applique RLS 100%, 4 policies par table, FK auth.users CASCADE, FK plan CASCADE et triggers', async () => {
  const migrationPath = path.join(rootDir, migrationFile);
  assert.ok(existsSync(migrationPath), 'Le fichier de migration SQL doit exister');

  const sql = readFileSync(migrationPath, 'utf8');
  assert.match(sql, /CREATE SCHEMA IF NOT EXISTS holidays;/);
  assert.match(sql, /GRANT USAGE ON SCHEMA holidays TO anon, authenticated, service_role;/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION holidays\.set_updated_at\(\)/);

  const db = await database();
  try {
    await db.exec(sql);

    // Initialisation des plans pour userA et userB
    await db.exec(`
      INSERT INTO holidays.year_plans (id, user_id, year, initial_leave, carried_over, csupp, public_holidays)
      VALUES
        ('plan_test_a', '${userA}', '2026', 26.0, 0.0, 0.0, 11.0),
        ('plan_test_b', '${userB}', '2026', 26.0, 0.0, 0.0, 11.0);
    `);

    // Initialisation des entrées pour userA et userB
    await db.exec(`
      INSERT INTO holidays.leave_entries (id, user_id, plan_id, kind, label, start_date, end_date, days)
      VALUES
        ('entry_test_a', '${userA}', 'plan_test_a', 'dates', 'Été', '2026-07-01', '2026-07-15', 10.0),
        ('entry_test_b', '${userB}', 'plan_test_b', 'dates', 'Été', '2026-07-01', '2026-07-15', 10.0);
    `);

    // Initialisation des paramètres pour userA et userB
    await db.exec(`
      INSERT INTO holidays.user_settings (user_id, default_initial_leave, country)
      VALUES
        ('${userA}', 26.0, 'LU'),
        ('${userB}', 26.0, 'LU');
    `);

    for (const table of tables) {
      // 1. 4 policies pour authenticated (DELETE, INSERT, SELECT, UPDATE)
      const policies = (
        await db.query(
          'SELECT cmd, roles, qual, with_check FROM pg_policies WHERE schemaname = $1 AND tablename = $2 ORDER BY cmd',
          ['holidays', table]
        )
      ).rows;
      assert.deepEqual(policies.map((p) => p.cmd), ['DELETE', 'INSERT', 'SELECT', 'UPDATE']);
      assert.ok(policies.every((p) => p.roles.length === 1 && p.roles[0] === 'authenticated'));

      // 2. RLS activé sur la table
      const rls = (
        await db.query(`SELECT relrowsecurity FROM pg_class WHERE oid = 'holidays.${table}'::regclass`)
      ).rows[0];
      assert.equal(rls.relrowsecurity, true);

      // 3. Privilèges de rôles
      for (const role of ['authenticated', 'service_role']) {
        for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
          const check = (
            await db.query('SELECT has_table_privilege($1, $2, $3) AS allowed', [
              role,
              `holidays.${table}`,
              privilege,
            ])
          ).rows[0];
          assert.equal(check.allowed, true);
        }
      }
      const anonCheck = (
        await db.query('SELECT has_table_privilege($1, $2, $3) AS allowed', [
          'anon',
          `holidays.${table}`,
          'SELECT',
        ])
      ).rows[0];
      assert.equal(anonCheck.allowed, false);

      // 4. Contrainte FK vers auth.users(id) ON DELETE CASCADE
      if (table === 'year_plans') {
        await assert.rejects(
          db.exec(`INSERT INTO holidays.year_plans (id, user_id, year) VALUES ('inv_plan', '${missingUser}', '2026');`),
          /foreign key/i
        );
      } else if (table === 'leave_entries') {
        await assert.rejects(
          db.exec(`INSERT INTO holidays.leave_entries (id, user_id, plan_id, kind, label) VALUES ('inv_entry', '${missingUser}', 'plan_test_a', 'dates', 'inv');`),
          /foreign key/i
        );
      } else if (table === 'user_settings') {
        await assert.rejects(
          db.exec(`INSERT INTO holidays.user_settings (user_id) VALUES ('${missingUser}');`),
          /foreign key/i
        );
      }

      // 5. RLS: sous le rôle authenticated avec token userA
      await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub = '${userA}';`);

      // SELECT voit uniquement userA
      const rowsA = (await db.query(`SELECT user_id FROM holidays.${table}`)).rows;
      assert.ok(rowsA.length > 0, `userA doit voir au moins une ligne dans ${table}`);
      assert.ok(rowsA.every((r) => r.user_id === userA), `userA ne doit voir que ses propres lignes dans ${table}`);

      // INSERT pour userB rejeté par RLS WITH CHECK
      if (table === 'year_plans') {
        await assert.rejects(
          db.exec(`INSERT INTO holidays.year_plans (id, user_id, year) VALUES ('illegal_b', '${userB}', '2027');`),
          /row-level security/i
        );
      } else if (table === 'leave_entries') {
        await assert.rejects(
          db.exec(`INSERT INTO holidays.leave_entries (id, user_id, plan_id, kind, label) VALUES ('illegal_b', '${userB}', 'plan_test_b', 'dates', 'illegal');`),
          /row-level security/i
        );
      } else if (table === 'user_settings') {
        await assert.rejects(
          db.exec(`INSERT INTO holidays.user_settings (user_id, country) VALUES ('${userB}', 'FR');`),
          /row-level security/i
        );
      }

      // UPDATE userB affecte 0 ligne
      const updateB = await db.query(
        `UPDATE holidays.${table} SET updated_at = '2000-01-01' WHERE user_id = '${userB}' RETURNING *`
      );
      assert.equal(updateB.rows.length, 0);

      // UPDATE changeant le user_id vers userB rejeté
      await assert.rejects(
        db.exec(`UPDATE holidays.${table} SET user_id = '${userB}' WHERE user_id = '${userA}';`),
        /row-level security/i
      );

      // UPDATE sur userA déclenche le trigger set_updated_at()
      const updatedRow = (
        await db.query(
          `UPDATE holidays.${table} SET updated_at = '2000-01-01' WHERE user_id = '${userA}' RETURNING updated_at`
        )
      ).rows[0];
      assert.ok(new Date(updatedRow.updated_at).getFullYear() >= 2026);

      // DELETE userB affecte 0 ligne
      const deleteB = await db.query(
        `DELETE FROM holidays.${table} WHERE user_id = '${userB}' RETURNING *`
      );
      assert.equal(deleteB.rows.length, 0);

      // Bascule vers userB et vérification de visibilité
      await db.exec(`SET request.jwt.claim.sub = '${userB}';`);
      const rowsB = (await db.query(`SELECT user_id FROM holidays.${table}`)).rows;
      assert.ok(rowsB.length > 0);
      assert.ok(rowsB.every((r) => r.user_id === userB));

      await db.exec('RESET ROLE;');
    }

    // 7. Fonction set_updated_at durcie (search_path=pg_catalog, invoker)
    const fn = (
      await db.query(
        "SELECT proconfig, prosecdef FROM pg_proc WHERE oid = 'holidays.set_updated_at()'::regprocedure"
      )
    ).rows[0];
    assert.deepEqual(fn.proconfig, ['search_path=pg_catalog']);
    assert.equal(fn.prosecdef, false);

    // 8. Contrainte FK et Cascade de plan_id vers leave_entries
    await assert.rejects(
      db.exec(`INSERT INTO holidays.leave_entries (id, user_id, plan_id, kind, label) VALUES ('fk_inv_entry', '${userA}', 'non_existent_plan', 'dates', 'x');`),
      /foreign key/i
    );
    await db.exec(`
      INSERT INTO holidays.year_plans (id, user_id, year) VALUES ('plan_cascade', '${userA}', '2030');
      INSERT INTO holidays.leave_entries (id, user_id, plan_id, kind, label) VALUES ('entry_cascade', '${userA}', 'plan_cascade', 'dates', 'Cascade');
    `);
    const entriesBefore = (await db.query("SELECT * FROM holidays.leave_entries WHERE id = 'entry_cascade'")).rows;
    assert.equal(entriesBefore.length, 1);
    await db.exec("DELETE FROM holidays.year_plans WHERE id = 'plan_cascade';");
    const entriesAfter = (await db.query("SELECT * FROM holidays.leave_entries WHERE id = 'entry_cascade'")).rows;
    assert.equal(entriesAfter.length, 0);

    // 9. Suppression en CASCADE depuis auth.users
    await db.exec(`DELETE FROM auth.users WHERE id = '${userB}';`);
    for (const table of tables) {
      const remaining = (await db.query(`SELECT * FROM holidays.${table} WHERE user_id = '${userB}'`))
        .rows;
      assert.equal(remaining.length, 0);
    }
  } finally {
    await db.close();
  }
});
