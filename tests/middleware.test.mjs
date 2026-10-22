import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../lib/supabase/middleware.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace('export async function', 'async function');

function setup({ env = { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-test-key' }, user = null, error = null, throws = false, refresh = false } = {}) {
  class Response {
    constructor(body, options = {}) {
      Object.assign(this, options, { body });
      this.jar = new Map();
      this.cookies = {
        set: (name, value, options) => {
          const c = typeof name === 'object' ? name : { name, value, ...options };
          this.jar.set(c.name, c);
        },
        getAll: () => [...this.jar.values()],
      };
    }
    static next() { return new Response(null, { status: 200 }); }
    static redirect(url) { return new Response(null, { status: 307, location: url.href }); }
  }
  let calls = 0;
  const context = vm.createContext({ URL, process: { env }, console: { error() {} }, NextResponse: Response,
    createServerClient: (url, key, { cookies }) => {
      calls++;
      if (throws) throw new Error('private detail');
      return { auth: { getUser: async () => {
        if (refresh) cookies.setAll([{ name: 'session', value: 'refreshed', options: { httpOnly: true } }]);
        return { data: { user }, error };
      } } };
    },
  });
  vm.runInContext(source, context);
  return {
    calls: () => calls,
    run: (path) => {
      const url = new URL(path, 'https://app.example');
      url.clone = () => new URL(url);
      return context.updateSession({ nextUrl: url, cookies: { getAll: () => [], set() {} } });
    },
  };
}

test('missing config returns non-cacheable 503 before client creation', async () => {
  const s = setup({ env: {} });
  const r = await s.run('/today');
  assert.equal(r.status, 503);
  assert.equal(r.headers['Cache-Control'], 'no-store');
  assert.equal(s.calls(), 0);
});
test('invalid URLs are rejected', async () => {
  for (const url of ['not-a-url', 'file:///secret']) {
    const s = setup({ env: { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'key' } });
    assert.equal((await s.run('/')).status, 503);
    assert.equal(s.calls(), 0);
  }
});
test('client exceptions and retryable Auth failures return 503', async () => {
  for (const options of [{ throws: true }, { error: { status: 503 } }, { error: { name: 'AuthRetryableFetchError', status: 0 } }]) {
    assert.equal((await setup(options).run('/today')).status, 503);
  }
});
test('signed-out private routes preserve the destination', async () => {
  const r = await setup().run('/plan?view=month');
  assert.equal(new URL(r.location).pathname, '/sign-in');
  assert.equal(new URL(r.location).searchParams.get('next'), '/plan?view=month');
});
test('public paths remain accessible, similar prefixes stay protected', async () => {
  assert.equal((await setup().run('/sign-in')).status, 200);
  assert.equal((await setup().run('/reset/update')).status, 200);
  assert.equal((await setup().run('/privacy-private')).status, 307);
});
test('authenticated users redirect from sign-in with refresh cookies', async () => {
  const r = await setup({ user: { id: 'member' }, refresh: true }).run('/sign-in');
  assert.equal(new URL(r.location).pathname, '/today');
  assert.equal(r.cookies.getAll()[0].value, 'refreshed');
  assert.equal(r.cookies.getAll()[0].httpOnly, true);
});
test('root redirects and authenticated member access are retained', async () => {
  assert.equal(new URL((await setup().run('/')).location).pathname, '/sign-in');
  assert.equal(new URL((await setup({ user: { id: 'member' } }).run('/')).location).pathname, '/today');
  assert.equal((await setup({ user: { id: 'member' } }).run('/today')).status, 200);
});
test('invalid authentication cannot authorize even if data contains a user', async () => {
  const r = await setup({ user: { id: 'member' }, error: { status: 401 } }).run('/today');
  assert.equal(new URL(r.location).pathname, '/sign-in');
});
