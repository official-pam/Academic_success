// Local stand-in for Supabase's HTTP APIs (Auth + PostgREST subset), for end-to-end tests only.
// Every data request runs inside a transaction as the JWT's role with request.jwt.claims set,
// exactly how PostgREST does it, so the migration's RLS policies are what decide access.
// Usage: DATABASE_URL=postgres://postgres@127.0.0.1:54329/tlv_e2e JWT_SECRET=... node tests/e2e/local-supabase.mjs
import http from 'node:http';
import crypto from 'node:crypto';
import pg from 'pg';

const PORT = Number(process.env.PORT || 54321);
const SECRET = process.env.JWT_SECRET || 'local-e2e-secret-local-e2e-secret';
// Return dates as 'YYYY-MM-DD' strings like PostgREST does (not JS Date objects).
pg.types.setTypeParser(1082, (v) => v);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const b64u = (b) => Buffer.from(b).toString('base64url');
export function sign(payload) {
  const head = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', SECRET).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}
function verify(token) {
  const [h, b, s] = (token || '').split('.');
  if (!s) return null;
  const expect = crypto.createHmac('sha256', SECRET).update(`${h}.${b}`).digest('base64url');
  if (s.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expect))) return null;
  const p = JSON.parse(Buffer.from(b, 'base64url').toString());
  if (p.exp && p.exp < Date.now() / 1000) return null;
  return p;
}
const hash = (pw) => crypto.createHash('sha256').update(`tlv:${pw}`).digest('hex');
const refreshTokens = new Map();

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Expose-Headers': 'Content-Range', ...headers });
  res.end(body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body));
}
const readBody = (req) => new Promise((ok) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => ok(d ? JSON.parse(d) : {})); });

function userJson(u) {
  return { id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, email_confirmed_at: u.email_confirmed_at, user_metadata: u.raw_user_meta_data || {}, app_metadata: { provider: 'email' }, created_at: u.created_at, updated_at: u.created_at, identities: [] };
}
function session(u) {
  const now = Math.floor(Date.now() / 1000);
  const access_token = sign({ sub: u.id, email: u.email, role: 'authenticated', aud: 'authenticated', iat: now, exp: now + 3600, session_id: crypto.randomUUID() });
  const refresh_token = crypto.randomBytes(24).toString('hex');
  refreshTokens.set(refresh_token, u.id);
  return { access_token, token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token, user: userJson(u) };
}
const authErr = (res, status, code, msg) => send(res, status, { code: status, error_code: code, msg, error: code, error_description: msg, message: msg });

async function auth(req, res, path, url) {
  const body = ['POST', 'PUT'].includes(req.method) ? await readBody(req) : {};
  const bearer = verify((req.headers.authorization || '').replace(/^Bearer /, ''));
  if (path === '/signup' && req.method === 'POST') {
    const { rows: ex } = await pool.query('select 1 from auth.users where email = $1', [body.email]);
    if (ex.length) return authErr(res, 422, 'user_already_exists', 'User already registered');
    const { rows } = await pool.query('insert into auth.users (email, encrypted_password, raw_user_meta_data) values ($1, $2, $3) returning *', [body.email, hash(body.password), body.data || {}]);
    return send(res, 200, session(rows[0]));
  }
  if (path === '/token') {
    const grant = url.searchParams.get('grant_type');
    if (grant === 'password') {
      const { rows } = await pool.query('select * from auth.users where email = $1 and encrypted_password = $2', [body.email, hash(body.password)]);
      if (!rows.length) return authErr(res, 400, 'invalid_credentials', 'Invalid login credentials');
      return send(res, 200, session(rows[0]));
    }
    if (grant === 'refresh_token') {
      const uid = refreshTokens.get(body.refresh_token);
      if (!uid) return authErr(res, 400, 'refresh_token_not_found', 'Invalid Refresh Token');
      const { rows } = await pool.query('select * from auth.users where id = $1', [uid]);
      if (!rows.length) return authErr(res, 400, 'user_not_found', 'User not found');
      return send(res, 200, session(rows[0]));
    }
  }
  if (path === '/user') {
    if (!bearer?.sub) return authErr(res, 401, 'bad_jwt', 'invalid JWT');
    if (req.method === 'PUT' && body.password) await pool.query('update auth.users set encrypted_password = $2 where id = $1', [bearer.sub, hash(body.password)]);
    const { rows } = await pool.query('select * from auth.users where id = $1', [bearer.sub]);
    if (!rows.length) return authErr(res, 403, 'user_not_found', 'User from sub claim in JWT does not exist');
    return send(res, 200, userJson(rows[0]));
  }
  if (path === '/logout') return send(res, 204);
  if (path === '/recover') return send(res, 200, {});
  const m = path.match(/^\/admin\/users\/([0-9a-f-]{36})$/);
  if (m && req.method === 'DELETE') {
    if (bearer?.role !== 'service_role') return authErr(res, 403, 'not_admin', 'User not allowed');
    await pool.query('delete from auth.users where id = $1', [m[1]]);
    return send(res, 200, {});
  }
  return authErr(res, 404, 'not_found', `No auth route ${req.method} ${path}`);
}

// ---------- PostgREST subset ----------
const ID = /^[a-z_][a-z0-9_]*$/;
const ident = (s) => { if (!ID.test(s)) throw Object.assign(new Error(`bad identifier ${s}`), { status: 400 }); return `"${s}"`; };
const OPS = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', like: 'like', ilike: 'ilike' };
const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);

function where(params, values) {
  const parts = [];
  for (const [key, raw] of params) {
    if (RESERVED.has(key)) continue;
    let v = raw, neg = false;
    if (v.startsWith('not.')) { neg = true; v = v.slice(4); }
    const dot = v.indexOf('.');
    const op = v.slice(0, dot), val = v.slice(dot + 1);
    let expr;
    if (op === 'is') expr = `${ident(key)} is ${val === 'null' ? 'null' : val === 'true' ? 'true' : 'false'}`;
    else if (op === 'in') { values.push(val.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/^"|"$/g, ''))); expr = `${ident(key)}::text = any($${values.length})`; }
    else if (OPS[op]) { values.push(op.includes('like') ? val.replace(/\*/g, '%') : val); expr = `${ident(key)} ${OPS[op]} $${values.length}`; }
    else throw Object.assign(new Error(`unsupported operator ${op}`), { status: 400 });
    parts.push(neg ? `not (${expr})` : expr);
  }
  return parts.length ? ` where ${parts.join(' and ')}` : '';
}
function orderBy(order) {
  if (!order) return '';
  return ' order by ' + order.split(',').map((o) => {
    const [col, ...mods] = o.split('.');
    return `${ident(col)} ${mods.includes('desc') ? 'desc' : 'asc'}${mods.includes('nullsfirst') ? ' nulls first' : mods.includes('nullslast') ? ' nulls last' : ''}`;
  }).join(', ');
}
const cols = (select) => (!select || select === '*' ? '*' : select.split(',').map((c) => ident(c.trim())).join(', '));

function pgError(e) {
  const status = e.status || (e.code === '23505' ? 409 : e.code === '42501' ? 403 : e.code === 'PGRST116' ? 406 : 400);
  return [status, { code: e.code || 'PGRST000', message: e.message, details: e.detail || null, hint: e.hint || null }];
}

async function asRole(claims, fn) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const role = ['authenticated', 'anon', 'service_role'].includes(claims.role) ? claims.role : 'anon';
    await client.query(`set local role ${role}`);
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    const out = await fn(client);
    await client.query('commit');
    return out;
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

async function rest(req, res, path, url) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '') || req.headers.apikey;
  const claims = verify(token) || { role: 'anon' };
  const params = [...url.searchParams.entries()];
  const prefer = req.headers.prefer || '';
  const wantsObject = (req.headers.accept || '').includes('vnd.pgrst.object');
  const body = ['POST', 'PATCH'].includes(req.method) ? await readBody(req) : null;
  try {
    const rpc = path.match(/^\/rpc\/([a-z_]+)$/);
    if (rpc) {
      const fn = rpc[1];
      const args = Object.entries(body || {});
      const values = args.map(([, v]) => v);
      const sql = `select * from public.${ident(fn)}(${args.map(([k], i) => `${ident(k)} => $${i + 1}`).join(', ')})`;
      const { rows, retset } = await asRole(claims, async (c) => {
        const r = await c.query(sql, values);
        const meta = await c.query('select proretset from pg_proc where proname = $1 and pronamespace = $2::regnamespace', [fn, 'public']);
        return { rows: r.rows, retset: meta.rows[0]?.proretset };
      });
      if (retset) return send(res, 200, rows);
      const row = rows[0];
      return send(res, 200, row && Object.keys(row).length === 1 && row[fn] !== undefined ? row[fn] : row ?? null);
    }
    const table = path.slice(1);
    ident(table);
    const select = url.searchParams.get('select');
    const values = [];
    let sql, countSql = null;
    if (req.method === 'GET' || req.method === 'HEAD') {
      const w = where(params, values);
      sql = `select ${cols(select)} from public.${ident(table)}${w}${orderBy(url.searchParams.get('order'))}`;
      const limit = url.searchParams.get('limit'), offset = url.searchParams.get('offset');
      if (limit) sql += ` limit ${Number(limit)}`;
      if (offset) sql += ` offset ${Number(offset)}`;
      if (prefer.includes('count=exact')) countSql = `select count(*)::int as n from public.${ident(table)}${w}`;
    } else if (req.method === 'POST') {
      const rows = Array.isArray(body) ? body : [body];
      const keys = Object.keys(rows[0]);
      const tuples = rows.map((r) => `(${keys.map((k) => { values.push(r[k]); return `$${values.length}`; }).join(', ')})`);
      sql = `insert into public.${ident(table)} (${keys.map(ident).join(', ')}) values ${tuples.join(', ')}`;
      if (prefer.includes('return=representation')) sql += ` returning ${cols(select)}`;
    } else if (req.method === 'PATCH') {
      const sets = Object.entries(body).map(([k, v]) => { values.push(v); return `${ident(k)} = $${values.length}`; });
      sql = `update public.${ident(table)} set ${sets.join(', ')}${where(params, values)}`;
      if (prefer.includes('return=representation')) sql += ` returning ${cols(select)}`;
    } else if (req.method === 'DELETE') {
      sql = `delete from public.${ident(table)}${where(params, values)}`;
    } else return send(res, 405, { message: 'method not allowed' });

    const { rows, count } = await asRole(claims, async (c) => {
      const r = await c.query(sql, values);
      const n = countSql ? (await c.query(countSql, values.slice(0, (countSql.match(/\$\d+/g) || []).length))).rows[0].n : null;
      return { rows: r.rows, count: n };
    });
    const headers = count !== null ? { 'Content-Range': `${rows.length ? `0-${rows.length - 1}` : '*'}/${count}` } : {};
    if (req.method === 'HEAD') return send(res, 200, undefined, headers);
    if (['POST', 'PATCH', 'DELETE'].includes(req.method) && !prefer.includes('return=representation')) return send(res, 201, undefined, headers);
    if (wantsObject) {
      if (rows.length !== 1) return send(res, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${rows.length} rows`, hint: null });
      return send(res, 200, rows[0], headers);
    }
    return send(res, 200, rows, headers);
  } catch (e) {
    const [status, err] = pgError(e);
    if (process.env.DEBUG) console.error(req.method, req.url, err);
    return send(res, status, err);
  }
}

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204);
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/auth/v1')) return await auth(req, res, url.pathname.slice(8), url);
    if (url.pathname.startsWith('/rest/v1')) return await rest(req, res, url.pathname.slice(8), url);
    send(res, 404, { message: 'not found' });
  } catch (e) {
    console.error(e);
    send(res, 500, { message: e.message });
  }
}).listen(PORT, () => console.log(`local supabase on :${PORT}`));

if (process.argv.includes('--print-keys')) {
  console.log('ANON', sign({ role: 'anon', iss: 'local', iat: 1700000000, exp: 4100000000 }));
  console.log('SERVICE', sign({ role: 'service_role', iss: 'local', iat: 1700000000, exp: 4100000000 }));
}
