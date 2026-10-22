import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const read = (path) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const db = new PGlite();
try {
  await db.exec(read('tests/db/supabase_stub.sql'));
  await db.exec(read('supabase/migrations/001_init.sql'));
  await db.exec(read('supabase/production-hardening.sql'));
  const sql = read('tests/db/rls_test.sql').split('-- Clean up fixtures')[0].replace(/^\\.*$/gm, '');
  await db.exec(sql);
  console.log(`Passed ${(sql.match(/select t.ok\(/g) || []).length} RLS assertions in isolated PostgreSQL (PGlite).`);
  await db.exec(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', false);`);
  const rows = (await db.query('select active_members, checkins from public.participation_weekly(1)')).rows;
  if (!rows.length || rows.some(row => row.active_members !== null || row.checkins !== null)) throw Error('Weekly small-group counts leaked');
  console.log('Passed direct weekly RPC small-group privacy assertion.');
  await db.exec(`select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}', false);`);
  let refused = false;
  try {
    await db.query(`insert into public.checkins (id,user_id,day) values (gen_random_uuid(),'00000000-0000-0000-0000-000000000004',public.lagos_today())`);
  } catch(error) { refused = error.code === '42501'; }
  if (!refused) throw Error('Cross-account check-in insert was not rejected by RLS');
  console.log('Passed cross-account offline check-in RLS assertion.');
} finally { await db.close(); }
