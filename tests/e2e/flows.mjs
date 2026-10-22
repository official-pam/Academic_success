// End-to-end walkthrough of the spec's usability tasks (§10), on a phone-sized viewport.
// Needs: the app on BASE (default http://localhost:3000) pointed at tests/e2e/local-supabase.mjs,
// and PG (postgres URL of the same database) to bootstrap the first chairman.
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const PG = process.env.PG || 'postgres://postgres@127.0.0.1:54329/tlv_e2e';
const SHOTS = process.env.SHOTS || 'test-results/screens';
fs.mkdirSync(SHOTS, { recursive: true });
const run = Date.now().toString(36);
const email = (n) => `${n}.${run}@example.ng`;
let passed = 0;
const ok = (cond, msg) => { if (!cond) throw new Error(`FAIL: ${msg}`); passed += 1; console.log(`ok - ${msg}`); };
const see = (loc) => loc.first().waitFor({ timeout: 10000 }).then(() => true, () => false);
const sql = (q) => execFileSync('psql', [PG, '-tAc', q]).toString().trim();

// Start from an empty test database (refuses to run against anything not named *_e2e).
if (!/_e2e$/.test(PG)) throw new Error('PG must point at a throwaway *_e2e database');
sql('delete from public.assignments; delete from public.announcements; delete from public.prayer_points; delete from auth.users;');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-NG', timezoneId: 'Africa/Lagos' };
const desktop = { viewport: { width: 1280, height: 860 }, locale: 'en-NG', timezoneId: 'Africa/Lagos' };

async function newUser(name, mail, level, dept, ctxOpts = phone) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`  [pageerror ${name}]`, e.message));
  await page.goto(`${BASE}/sign-up`); await hydrated(page);
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Email').fill(mail);
  await page.getByLabel('Password').fill('choir-reads-2026');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/onboarding'); await hydrated(page);
  await page.locator(`text=${level}L`).first().click();
  await page.getByLabel('Department').fill(dept);
  await page.getByRole('button', { name: 'Start reading' }).click();
  await page.waitForURL('**/today**'); await hydrated(page);
  return { ctx, page };
}
const hydrated = (page) => page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
// No human-speed pauses: back-to-back saves must work at automation speed.
const settle = () => Promise.resolve();
const shot = (page, name) => page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });

try {
  // ---- Sign-in page states --------------------------------------------------
  {
    const ctx = await browser.newContext(phone);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/today`); await hydrated(page);
    ok(page.url().includes('/sign-in'), 'signed-out visitor is sent to sign in');
    await page.getByLabel('Email').fill('nobody@example.ng');
    await page.getByLabel('Password', { exact: true }).fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByText("That email and password don't match").waitFor();
    ok(true, 'wrong password shows a plain-language error');
    await shot(page, '01-sign-in-error');
    await ctx.close();
  }

  // ---- Member A: onboarding, check-in, note, plan, goal ----------------------
  const amaka = await newUser('Amaka Okafor', email('amaka'), 200, 'Chemistry');
  let p = amaka.page;
  ok(await see(p.getByText("You're set up")), 'onboarding lands on Today with a welcome');
  ok(await see(p.getByRole('heading', { level: 1, name: 'Read for 30 minutes' })), 'Today shows the starter reading goal');
  await shot(p, '02-today-before');
  const t0 = Date.now();
  await p.getByRole('button', { name: 'I read today' }).click();
  await p.getByText('You read today').waitFor();
  ok(Date.now() - t0 < 10000, `check-in completes in under 10 seconds (${Date.now() - t0} ms)`);
  ok(await see(p.getByText('1 of 5 days this week')), 'weekly progress reads "1 of 5 days this week"');
  await p.getByRole('button', { name: /Add minutes or a private note/ }).click();
  await p.getByLabel('Minutes read').fill('40');
  await p.getByLabel(/^Note/).fill('Organic chem: alkenes');
  await p.getByRole('button', { name: 'Save', exact: true }).click();
  await p.getByText('Saved.', { exact: true }).waitFor(); await settle(p);
  await p.reload();
  await p.getByText('You read today').waitFor();
  ok(true, 'check-in survives a reload (saved on the server)');
  ok(await see(p.getByText(/40 min/)), 'minutes were saved');
  ok(await see(p.getByText('1 of 5 days this week')), 'reload still counts one day, not two');
  await shot(p, '03-today-done');
  ok(sql(`select count(*) from public.checkins c join auth.users u on u.id = c.user_id where u.email = '${email('amaka')}'`) === '1', 'exactly one check-in row in the database');

  await p.getByRole('link', { name: 'Plan' }).first().click();
  await p.waitForURL('**/plan'); await hydrated(p);
  await p.getByLabel('Title').fill('CHM 201 chapter 4');
  await p.getByLabel('Time').fill('16:00');
  await p.getByRole('button', { name: 'Add to plan' }).click();
  await p.getByText('Session added to your plan.').waitFor(); await settle(p);
  ok(await see(p.getByText('CHM 201 chapter 4').first()), 'study session appears in the agenda');
  await p.getByRole('button', { name: 'Mark done' }).first().click();
  await p.getByRole('button', { name: 'Mark not done' }).first().waitFor(); await settle(p);
  ok(true, 'session can be marked done');
  await p.getByRole('button', { name: 'Change goal' }).click();
  await p.getByRole('textbox', { name: 'Goal' }).fill('Read 2 chapters');
  await p.getByLabel('Days a week').selectOption('6');
  await p.getByRole('button', { name: 'Save goal' }).click();
  await p.getByText('Goal updated.').waitFor(); await settle(p);
  ok(await see(p.getByText('Earlier goals (1)')), 'changing the goal keeps the earlier goal in history');
  await shot(p, '04-plan');
  await p.getByRole('link', { name: 'Month' }).click();
  await p.waitForURL('**view=month**', { waitUntil: 'commit' }); await hydrated(p); await p.getByRole('table').waitFor();
  await shot(p, '05-plan-month');

  // ---- Member B: offline check-in -------------------------------------------
  const bayo = await newUser('Bayo Adeyemi', email('bayo'), 300, 'Civil Engineering');
  p = bayo.page;
  await bayo.ctx.setOffline(true);
  await p.getByRole('button', { name: 'I read today' }).click();
  await p.getByText('Saved on this phone', { exact: true }).waitFor();
  ok(await see(p.getByText('Not synced yet')), 'offline check-in is shown as pending, not as saved');
  ok(await see(p.getByText('(1 waiting to sync)')), 'weekly progress labels the pending day');
  ok(sql(`select count(*) from public.checkins c join auth.users u on u.id = c.user_id where u.email = '${email('bayo')}'`) === '0', 'nothing reached the server while offline');
  await shot(p, '06-today-offline-pending');
  await bayo.ctx.setOffline(false);
  await p.evaluate(() => window.dispatchEvent(new Event('online')));
  await p.getByText('You read today').waitFor({ timeout: 15000 });
  ok(sql(`select count(*) from public.checkins c join auth.users u on u.id = c.user_id where u.email = '${email('bayo')}'`) === '1', 'reconnecting syncs the check-in exactly once');
  await p.evaluate(() => window.dispatchEvent(new Event('online')));
  await p.waitForTimeout(800);
  ok(sql(`select count(*) from public.checkins c join auth.users u on u.id = c.user_id where u.email = '${email('bayo')}'`) === '1', 'a second sync attempt creates no duplicate');
  await p.goto(`${BASE}/admin`); await hydrated(p);
  ok(p.url().endsWith('/today'), 'a member opening /admin is sent back to Today');

  // ---- Chairman bootstrap + appoint a coordinator ---------------------------
  const chair = await newUser('Tolu Chairman', email('chair'), 400, 'Physics', desktop);
  sql(`update public.profiles set role = 'chairman' from auth.users u where u.id = profiles.id and u.email = '${email('chair')}'`);
  const coord = await newUser('Kemi Coordinator', email('kemi'), 200, 'Biochemistry');
  p = chair.page;
  await p.goto(`${BASE}/admin/people?q=Kemi`); await hydrated(p);
  await p.getByLabel('Role for Kemi Coordinator').selectOption('coordinator:200');
  await p.getByRole('button', { name: 'Save' }).first().click();
  await p.getByText('Role updated.').waitFor();
  ok(sql(`select role || ':' || coordinator_level from public.profiles p join auth.users u on u.id = p.id where u.email = '${email('kemi')}'`) === 'coordinator:200', 'chairman appoints a 200L coordinator');
  await p.goto(`${BASE}/admin/people`); await hydrated(p);
  await shot(p, '07-admin-people-desktop');

  // ---- Coordinator publishes (double tap must not duplicate) ----------------
  p = coord.page;
  await p.goto(`${BASE}/admin/assignments/new`); await hydrated(p);
  await p.getByLabel('Title').fill('Read CHM 201 notes, week 6');
  await p.getByLabel('Instructions').fill('Read pages 40 to 62 before Thursday.\n\nBring questions to the study group.');
  await p.getByLabel(/^Resources/).fill('Past questions 2024 – https://example.org/chm201.pdf');
  const due = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  await p.getByLabel('Deadline date').fill(due);
  await p.getByText(/Reaches \d+ member/).waitFor();
  const n200 = sql(`select count(*) from public.profiles where level = 200 and onboarded_at is not null`);
  ok(await see(p.getByText(`Reaches ${n200} members`)), `audience preview counts the ${n200} 200L members`);
  await p.getByRole('button', { name: 'Preview as a member' }).click();
  await shot(p, '08-admin-assignment-preview');
  // Two taps in the same frame, before React can disable the button.
  await p.getByRole('button', { name: 'Publish' }).evaluate((btn) => { btn.click(); btn.click(); });
  await p.waitForURL('**/admin/assignments?status=published**'); await hydrated(p);
  ok(sql(`select count(*) from public.assignments where title = 'Read CHM 201 notes, week 6'`) === '1', 'double-tapping Publish creates one assignment');
  ok(sql(`select status from public.assignments where title = 'Read CHM 201 notes, week 6'`) === 'published', 'and it is published, not left as a draft');
  await p.goto(`${BASE}/admin/announcements/new`); await hydrated(p);
  await p.getByLabel('Title').fill('Study group moves to Saturday');
  await p.getByLabel('Message').fill('This week the 200L study group meets on Saturday at 4 pm in the chapel annex.');
  await p.getByRole('button', { name: 'Publish' }).click();
  await p.waitForURL('**/admin/announcements?status=published**'); await hydrated(p);
  ok(true, 'coordinator publishes an announcement');
  await p.goto(`${BASE}/admin/prayer-points/new`); await hydrated(p);
  await p.getByLabel(/^Prayer points/).fill('For focus and good recall in exams\nFor members writing CHM 201 this week\nFor wisdom for our coordinators');
  await p.getByLabel(/^Scripture/).fill('James 1:5');
  await p.getByRole('button', { name: 'Publish' }).click();
  await p.waitForURL('**/admin/prayer-points?status=published**'); await hydrated(p);
  ok(true, 'coordinator publishes prayer points');
  await p.goto(`${BASE}/admin`); await hydrated(p);
  ok((await p.getByRole('row', { name: /^300L/ }).count()) === 0 && (await see(p.getByRole('row', { name: /^200L/ }))), 'coordinator sees participation for their level only');
  await shot(p, '09-admin-participation-coordinator');

  // ---- Members see the right content ----------------------------------------
  p = amaka.page;
  await p.goto(`${BASE}/today`); await hydrated(p);
  ok(await see(p.getByText('Read CHM 201 notes, week 6')), '200L member sees the new assignment as the next deadline');
  ok(await see(p.getByText('Study group moves to Saturday')), '200L member sees the latest announcement on Today');
  await shot(p, '10-today-with-content');
  await p.getByRole('link', { name: 'Support' }).first().click();
  await p.getByText('For members writing CHM 201 this week').waitFor();
  ok(await see(p.getByText('Kemi Coordinator')), 'Support names the member\'s level coordinator');
  await shot(p, '11-support');
  await p.getByRole('link', { name: 'Updates' }).first().click();
  await p.waitForURL('**/updates'); await hydrated(p);
  await shot(p, '12-updates');
  await p.getByRole('link', { name: /Read CHM 201 notes/ }).click();
  await p.waitForURL('**/assignments/**'); await hydrated(p);
  ok(await see(p.getByRole('link', { name: 'Past questions 2024' })), 'assignment resources render as links');
  await shot(p, '13-assignment');
  p = bayo.page;
  await p.goto(`${BASE}/updates`); await hydrated(p);
  ok(!(await p.getByText('Read CHM 201 notes, week 6').isVisible()), '300L member does not see the 200L assignment');
  ok(!(await p.getByText('Study group moves to Saturday').isVisible()), '300L member does not see the 200L announcement');

  // ---- Chairman: participation + export -------------------------------------
  p = chair.page;
  await p.goto(`${BASE}/admin`); await hydrated(p);
  const row200 = p.getByRole('row', { name: /^200L/ }).first();
  const [m200, a200] = sql(`select count(distinct p.id) || ' ' || count(distinct c.user_id) from public.profiles p left join public.checkins c on c.user_id = p.id and c.day >= (now() at time zone 'Africa/Lagos')::date - (extract(isodow from now() at time zone 'Africa/Lagos')::int - 1) where p.level = 200 and p.onboarded_at is not null`).split(' ');
  const rowText = (await row200.innerText()).replace(/\s+/g, ' ');
  if (Number(m200) >= 3) ok(rowText.includes(`${m200} ${a200} (${Math.round((a200 / m200) * 100)}%)`), `200L row matches the database (${rowText})`);
  else ok(rowText.includes(`200L ${m200} —`) && !rowText.includes('%'), `200L has ${m200} members, so its reading share is hidden (${rowText})`);
  await shot(p, '14-admin-participation-desktop');
  const [download] = await Promise.all([p.waitForEvent('download'), p.getByRole('link', { name: /Export semester summary/ }).click()]);
  const csv = fs.readFileSync(await download.path(), 'utf8');
  ok(csv.startsWith('week_start,level,members,members_who_read,share_percent,checkins'), 'CSV export has a header');
  ok(!/Amaka|alkenes|@/.test(csv), 'CSV export contains no names, notes or emails');
  ok(csv.split('\n').filter((l) => /,200L,2,/.test(l)).every((l) => /,200L,2,,,$/.test(l)), 'CSV hides reading figures for groups under 3');

  // ---- Profile: privacy + delete account ------------------------------------
  p = bayo.page;
  await p.goto(`${BASE}/profile`); await hydrated(p);
  ok(await see(p.getByRole('cell', { name: 'Only you' }).first()), 'profile explains who can see check-ins');
  await shot(p, '15-profile');
  await p.getByText('Delete my account').click();
  await p.getByLabel('Type DELETE to confirm').fill('DELETE');
  await p.getByRole('button', { name: 'Delete account' }).click();
  await p.waitForURL('**/sign-in'); await hydrated(p);
  ok(sql(`select count(*) from auth.users where email = '${email('bayo')}'`) === '0', 'account deletion removes the user');
  ok(sql(`select count(*) from public.checkins c left join public.profiles pr on pr.id = c.user_id where pr.id is null`) === '0', 'their check-ins are deleted with them');

  // ---- Desktop views for the record ------------------------------------------
  const d = await browser.newContext(desktop);
  const dp = await d.newPage();
  await dp.goto(`${BASE}/sign-in`); await hydrated(dp);
  await dp.getByLabel('Email').fill(email('amaka'));
  await dp.getByLabel('Password', { exact: true }).fill('choir-reads-2026');
  await dp.getByRole('button', { name: 'Sign in' }).click();
  await dp.waitForURL('**/today'); await hydrated(dp);
  ok(true, 'returning member signs in on desktop');
  await shot(dp, '16-today-desktop');
  await dp.goto(`${BASE}/plan`); await hydrated(dp);
  await shot(dp, '17-plan-desktop');

  console.log(`\nALL ${passed} E2E CHECKS PASSED`);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
