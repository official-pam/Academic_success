import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const redirectSource = readFileSync(new URL('../lib/auth-redirect.js', import.meta.url), 'utf8').replace('export function', 'function');
const configSource = readFileSync(new URL('../lib/supabase/config.js', import.meta.url), 'utf8').replace('export function', 'function');
const context = vm.createContext({ URL });
vm.runInContext(redirectSource, context);

test('return URLs reject cross-origin tricks and control characters', () => {
  for (const value of ['https://evil.test', '//evil.test', '/\\evil.test', '/\t/evil.test', '/\n/evil.test', null, 'javascript:alert(1)']) {
    assert.equal(context.safeNext(value), '/today', String(value));
  }
});
test('relative return URLs retain their query and fragment', () => {
  assert.equal(context.safeNext('/plan?view=month#today'), '/plan?view=month#today');
  assert.equal(context.safeNext('/reset/update'), '/reset/update');
});
function config(env) {
  const c = vm.createContext({ URL, atob, process: { env } });
  vm.runInContext(configSource, c);
  return c.getSupabaseConfig();
}
test('publishable key takes precedence and legacy anon keys still work', () => {
  const env = { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'legacy' };
  assert.equal(config(env).key, 'sb_publishable_test');
  delete env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  assert.equal(config(env).key, 'legacy');
});
test('secret keys and legacy service-role keys cannot configure public clients', () => {
  const env = { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co' };
  for (const key of ['sb_secret_private', `header.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.signature`]) {
    assert.throws(() => config({ ...env, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key }));
  }
});
