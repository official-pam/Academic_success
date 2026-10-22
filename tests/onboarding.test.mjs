import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../app/onboarding/actions.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export async function', 'async function');
function setup({ profileError = null, missing = false, goalError = null, rpcError = null, count = 0, user = { id: 'member' } } = {}) {
  const updates = [], logs = [];
  let rpcCalls = 0;
  const client = {
    auth: { getUser: async () => ({ data: { user } }) },
    from(table) {
      if (table === 'profiles') return { update(values) {
        updates.push(values);
        return { eq: () => ({ select: () => ({ maybeSingle: async () => ({ data: missing ? null : { id: 'member' }, error: profileError }) }) }) };
      } };
      return { select: () => ({ eq: async () => ({ count, error: goalError }) }) };
    },
    rpc: async () => { rpcCalls++; return { error: rpcError }; },
  };
  const c = vm.createContext({ LEVELS: [100,200,300,400,500], getServerSupabase: async () => client,
    redirect: (url) => { throw new Error(`REDIRECT:${url}`); }, console: { error: (...args) => logs.push(args) } });
  vm.runInContext(source, c);
  const form = new FormData();
  for (const [k,v] of Object.entries({ full_name: 'Test Member', level: '100', department: 'Music', days_per_week: '5' })) form.set(k,v);
  return { run: () => c.completeOnboarding(null, form), updates, logs, rpcCalls: () => rpcCalls };
}
test('profile permission errors are observable without leaking personal details', async () => {
  const s = setup({ profileError: { code: '42501', message: 'private detail' } });
  assert.ok((await s.run()).message);
  assert.equal(s.logs[0][1].code, '42501');
  assert.equal(s.logs[0][1].stage, 'profile.update');
  assert.ok(!JSON.stringify(s.logs).includes('private detail'));
  assert.equal(s.rpcCalls(), 0);
});
test('a missing or RLS-hidden profile cannot appear to succeed', async () => {
  const s = setup({ missing: true });
  assert.ok((await s.run()).message);
  assert.equal(s.logs[0][1].code, 'PROFILE_NOT_FOUND');
});
test('goal read and creation failures leave onboarding incomplete for retry', async () => {
  for (const options of [{ goalError: { code: '42501' } }, { rpcError: { code: 'PGRST202' } }]) {
    const s = setup(options);
    assert.ok((await s.run()).message);
    assert.equal(s.updates.length, 1);
    assert.equal(s.updates[0].onboarded_at, undefined);
  }
});
test('successful setup creates a goal then marks the profile complete', async () => {
  const s = setup();
  await assert.rejects(s.run(), /REDIRECT:\/today\?welcome=1/);
  assert.equal(s.rpcCalls(), 1);
  assert.equal(s.updates.length, 2);
  assert.ok(s.updates[1].onboarded_at);
});
test('existing active goals are preserved', async () => {
  const s = setup({ count: 1 });
  await assert.rejects(s.run(), /REDIRECT:/);
  assert.equal(s.rpcCalls(), 0);
});
test('signed-out callers are redirected before any write', async () => {
  const s = setup({ user: null });
  await assert.rejects(s.run(), /REDIRECT:\/sign-in/);
  assert.equal(s.updates.length, 0);
});
