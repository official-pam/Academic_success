// End-to-end checks for the 24 Oct workflow changes, on a phone-sized screen:
// owner becomes Admin, school/programme dropdowns, course enrolment with suggestions, targets and results,
// GPA and distribution, memory verse text, focus timer that rings and records, add-to-calendar,
// committee head scope (students, activity feed, badge), school-targeted announcements.
// Needs the app (built, started with ADMIN_EMAILS=owner@example.ng) on BASE, pointed at tests/e2e/local-supabase.mjs,
// and PG pointing at the same throwaway *_e2e database.
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const PG = process.env.PG || 'postgres://postgres@127.0.0.1:54329/tlv_e2e';
const SHOTS = process.env.SHOTS || 'test-results/v2';
fs.mkdirSync(SHOTS, { recursive: true });
if (!/_e2e$/.test(PG)) throw new Error('PG must point at a throwaway *_e2e database');
const sql = (q) => execFileSync('psql', [PG, '-tAc', q]).toString().trim();
sql('delete from public.assignments; delete from public.announcements; delete from public.prayer_points; delete from auth.users;');

let passed = 0;
const ok = (cond, msg) => { if (!cond) throw new Error(`FAIL: ${msg}`); passed += 1; console.log(`ok - ${msg}`); };
const see = (loc, timeout = 10000) => loc.first().waitFor({ timeout }).then(() => true, () => false);
const hydrated = (page) => page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
const shot = (page, name) => page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-NG', timezoneId: 'Africa/Lagos', acceptDownloads: true };
const desktop = { viewport: { width: 1280, height: 860 }, locale: 'en-NG', timezoneId: 'Africa/Lagos' };

async function signUp(name, email, school, programme, level, opts = phone) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`  [pageerror ${name}]`, e.message));
  await page.goto(`${BASE}/sign-up`); await hydrated(page);
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('choir-reads-2026');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/onboarding'); await hydrated(page);
  await page.locator(`text=${level}L`).first().click();
  await page.getByLabel('School').selectOption(school);
  await page.getByLabel('Department / programme').selectOption({ label: programme });
  await page.getByRole('button', { name: 'Start reading' }).click();
  await page.waitForURL('**/today**'); await hydrated(page);
  return { ctx, page };
}

try {
  // ---- Owner becomes Admin automatically; dropdowns, not typing ---------------------------------
  const owner = await signUp('Emmanuel Owner', 'owner@example.ng', 'SEET', 'Electrical and Electronics Engineering', 400, desktop);
  ok(sql(`select role from public.profiles p join auth.users u on u.id = p.id where u.email = 'owner@example.ng'`) === 'chairman', 'owner email in ADMIN_EMAILS becomes Admin without SQL');
  ok(sql(`select school_code || '|' || department from public.profiles p join auth.users u on u.id = p.id where u.email = 'owner@example.ng'`) === 'SEET|Electrical and Electronics Engineering', 'school and programme come from the dropdowns');

  // ---- Member Ama: SEET, EEE, 300L ----------------------------------------------------------------
  const ama = await signUp('Ama Okafor', 'ama@example.ng', 'SEET', 'Electrical and Electronics Engineering', 300);
  let p = ama.page;
  ok(await see(p.getByText('Today\'s memory verse')), 'Today shows the memory verse card');
  const verseText = await p.locator('section[aria-labelledby="verse-heading"] blockquote p').first().innerText();
  ok(verseText.length > 20 && verseText.startsWith('“'), `verse text is on the card (“${verseText.slice(1, 40)}…”)`);
  ok(await p.locator('section[aria-labelledby="verse-heading"] footer').innerText().then((t) => /\d+:\d+.*WEB/.test(t)), 'verse reference and version shown on the card');
  ok((await p.locator('section[aria-labelledby="verse-heading"] a[href*="bible.com"]').count()) === 0, 'no link out to a Bible website');
  ok((await p.locator('section[aria-labelledby="verse-heading"] img[src*="images.unsplash.com"]').count()) === 1, 'verse sits on a nature photograph');
  await shot(p, '01-today-verse');

  await p.goto(`${BASE}/courses?session=2026%2F2027&semester=1`); await hydrated(p);
  const box = p.getByRole('combobox', { name: 'Add a course' });
  await box.fill('eee 3');
  ok(await see(p.getByRole('listbox').getByRole('option').filter({ hasText: /EEE 3\d\d/ })), 'typing "eee 3" suggests EEE 300-level courses');
  const first = p.getByRole('listbox').getByRole('option').first();
  const firstText = await first.innerText();
  ok(/matches this semester/.test(firstText), 'courses for this level and semester are suggested first');
  await box.press('Enter');
  await p.getByRole('button', { name: 'Add course' }).click();
  await p.getByText('Course added.').waitFor();
  ok(await see(p.getByRole('listitem').filter({ hasText: 'Start focus timer' })), 'course appears under This semester');
  const enrolled = sql(`select course_code || '|' || credit_units from public.enrolments`);
  ok(/^FUTM-EEE \d{3}\|\d+$|^[A-Z-]+ ?\d{3}\|\d+$/.test(enrolled), `catalogue code and units saved (${enrolled})`);

  await p.getByText('Not in the list? Add it by hand').click();
  await p.getByLabel('Course code').fill('gst 311');
  await p.getByLabel('Units', { exact: true }).fill('2');
  await p.getByLabel('Course title').fill('Entrepreneurship');
  await p.getByRole('button', { name: 'Add course' }).click();
  await p.getByText('Course added.').waitFor();
  ok(sql(`select count(*) from public.enrolments where course_code = 'GST 311'`) === '1', 'a course can be added by hand when it isn\'t listed');

  const card = p.getByRole('listitem').filter({ hasText: 'GST 311' });
  await card.getByLabel('Target grade').selectOption('A');
  await card.getByLabel('My realistic goal').fill('Finish the business plan draft by week 6');
  await card.getByRole('button', { name: 'Save target' }).click();
  await p.getByText('Target saved.').waitFor();
  ok(sql(`select target_grade || '|' || goal from public.enrolments where course_code = 'GST 311'`) === 'A|Finish the business plan draft by week 6', 'target grade and goal saved per course');
  await card.getByText('Enter result').click();
  await card.getByLabel('Score (0–100)').fill('72');
  ok(await see(card.getByText('That score is a')), 'score shows its grade before saving');
  await card.getByRole('button', { name: 'Save result' }).click();
  await p.getByText('Result saved.').waitFor();
  ok(sql(`select grade from public.enrolments where course_code = 'GST 311'`) === 'A', 'score 72 is saved as grade A');
  await p.reload(); await hydrated(p);
  ok(await see(p.getByText('5.00').first()), 'semester GPA shows 5.00 from the one result');
  ok(await see(p.getByText('Grade distribution')), 'grade distribution appears where courses are entered');
  ok(await see(p.getByText('You reached your target. Well done.')), 'meeting the target is acknowledged');
  await shot(p, '02-courses');

  // ---- Focus timer rings and records -----------------------------------------------------------------
  await ama.ctx.grantPermissions(['notifications']);
  await p.clock.install();
  await p.goto(`${BASE}/focus`); await hydrated(p);
  await p.evaluate(() => {
    window.__rang = 0;
    const AC = window.AudioContext;
    window.AudioContext = class extends AC { createOscillator() { window.__rang += 1; return super.createOscillator(); } };
    navigator.vibrate = () => { window.__vibrated = true; return true; };
  });
  await p.getByLabel('Custom minutes').fill('1');
  await p.getByRole('button', { name: 'Start timer' }).click();
  ok(await see(p.getByRole('timer')), 'timer starts and counts down');
  await shot(p, '03-focus-running');
  await p.clock.runFor(61_000);
  await p.getByText('Session complete').waitFor({ timeout: 15000 });
  ok(await p.evaluate(() => window.__rang > 0 && window.__vibrated === true), 'alarm chime played and the phone vibrated');
  ok(sql(`select count(*) from public.focus_sessions where completed`) === '1', 'finished focus session is recorded');
  await shot(p, '04-focus-done');

  // ---- Add to calendar ---------------------------------------------------------------------------------
  await p.goto(`${BASE}/plan`); await hydrated(p);
  await p.getByLabel('Title').fill('EEE 301 revision');
  await p.getByLabel('Time').fill('16:00');
  await p.getByRole('button', { name: 'Add to plan' }).click();
  await p.getByText('Session added to your plan.').waitFor();
  const row = p.getByRole('listitem').filter({ hasText: 'EEE 301 revision' }).first();
  await row.getByText('Add to calendar').click();
  const [dl] = await Promise.all([p.waitForEvent('download'), row.getByRole('button', { name: 'Phone calendar' }).click()]);
  const ics = fs.readFileSync(await dl.path(), 'utf8');
  ok(/BEGIN:VEVENT[\s\S]*SUMMARY:Study: EEE 301 revision[\s\S]*TRIGGER:-PT10M/.test(ics), 'study session downloads as a calendar event with a reminder');
  ok(/DTSTART:\d{8}T150000Z/.test(ics), '4 pm Lagos time is written as 15:00 UTC');

  // ---- Member in another school ------------------------------------------------------------------------
  const bola = await signUp('Bola Adeyemi', 'bola@example.ng', 'SICT', 'Computer Science', 200);

  // ---- Admin makes Kemi committee head for SEET ---------------------------------------------------------
  const kemi = await signUp('Kemi Head', 'kemi@example.ng', 'SEET', 'Electrical and Electronics Engineering', 400);
  await kemi.page.goto(`${BASE}/profile`); await hydrated(kemi.page);
  const seetProgrammes = await kemi.page.getByLabel('Department / programme').locator('option').allInnerTexts();
  ok(!seetProgrammes.includes('Mechanical Engineering') && seetProgrammes.includes('Electrical and Electronics Engineering'), 'programme list only shows the chosen school\'s programmes');
  await kemi.page.getByLabel('School').selectOption('SIPET');
  ok((await kemi.page.getByLabel('Department / programme').locator('option').allInnerTexts()).includes('Mechanical Engineering'), 'switching school switches the programme list');
  p = owner.page;
  await p.goto(`${BASE}/admin/people?q=Kemi`); await hydrated(p);
  await p.getByLabel('Role for Kemi Head').selectOption('coordinator');
  await p.getByLabel('School Kemi Head looks after').selectOption('SEET');
  await p.getByRole('button', { name: 'Save' }).first().click();
  await p.getByText('Saved.').waitFor();
  ok(sql(`select role || '|' || committee_school from public.profiles p join auth.users u on u.id = p.id where u.email = 'kemi@example.ng'`) === 'coordinator|SEET', 'admin makes Kemi committee head for SEET');
  await shot(p, '05-admin-people');

  // ---- Committee head: badge, activity, students -----------------------------------------------------------
  p = kemi.page;
  await p.goto(`${BASE}/today`); await hydrated(p);
  const bell = p.getByRole('link', { name: /Student activity, 2 new/ });
  ok(await see(bell), 'committee head\'s bell shows 2 new (Ama\'s result and focus session)');
  await bell.click();
  await p.waitForURL('**/admin/activity'); await hydrated(p);
  ok(await see(p.getByText('recorded a result for')), 'activity shows Ama\'s result');
  ok(await see(p.getByText('finished a focus session on')), 'activity shows Ama\'s focus session');
  await shot(p, '06-activity');
  await p.goto(`${BASE}/today`); await hydrated(p);
  ok(await see(p.getByRole('link', { name: 'Student activity' })), 'badge clears after viewing');
  await p.goto(`${BASE}/admin/students`); await hydrated(p);
  ok(await see(p.getByRole('link', { name: 'Ama Okafor' })), 'Ama is in Kemi\'s students');
  ok((await p.getByRole('link', { name: 'Bola Adeyemi' }).count()) === 0, 'Bola (SICT) is not in Kemi\'s students');
  await shot(p, '07-students');
  await p.getByRole('link', { name: 'Ama Okafor' }).click();
  await p.waitForURL('**/admin/students/**'); await hydrated(p);
  ok(await see(p.getByText('Finish the business plan draft by week 6')), 'mentor sees the student\'s goal');
  ok(await see(p.getByText('Recent focus sessions')), 'mentor sees focus sessions');
  await shot(p, '08-student-detail');

  // ---- School-targeted announcement ------------------------------------------------------------------------
  await p.goto(`${BASE}/admin/announcements/new`); await hydrated(p);
  ok(await see(p.locator('p#school_code', { hasText: 'SEET' })), 'committee head is pinned to their school when posting');
  await p.getByLabel('Title').fill('SEET study group Saturday');
  await p.getByLabel('Message').fill('SEET members, the study group meets on Saturday at 4 pm.');
  await p.getByRole('button', { name: 'Publish' }).click();
  await p.waitForURL('**/admin/announcements?status=published**');
  await ama.page.goto(`${BASE}/updates`); await hydrated(ama.page);
  ok(await see(ama.page.getByText('SEET study group Saturday')), 'SEET member sees the SEET announcement');
  await bola.page.goto(`${BASE}/updates`); await hydrated(bola.page);
  ok((await bola.page.getByText('SEET study group Saturday').count()) === 0, 'SICT member does not see it');

  // ---- Admin sees everyone ----------------------------------------------------------------------------------
  p = owner.page;
  await p.goto(`${BASE}/admin/students`); await hydrated(p);
  ok(await see(p.getByRole('link', { name: 'Bola Adeyemi' })) && await see(p.getByRole('link', { name: 'Ama Okafor' })), 'admin sees students in every school');

  console.log(`\nALL ${passed} V2 CHECKS PASSED`);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
