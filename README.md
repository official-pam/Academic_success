# TLV Academic — Season of Restored Glory

Installable PWA for the TLV choir's Academic Committee. Members (100L–500L) record daily reading in one tap, plan their semester, read prayer points, assignments and announcements. Coordinators and the chairman publish content and see **aggregate** participation only.

Stack: Next.js 15 (App Router, JS) · Tailwind 4 · Supabase (Postgres, Auth, RLS) · Vercel.

## What's in the box

| Area | Routes | Notes |
| --- | --- | --- |
| Auth | `/sign-up` `/sign-in` `/reset` `/reset/update` `/auth/callback` | Email + password. Reset via email link. |
| Onboarding | `/onboarding` | Name, level, department, days-per-week goal. No CGPA. |
| Today | `/today` | Goal, **"I read today"** (offline-safe), week stave, next deadline, latest update. |
| Plan | `/plan` `/plan?view=month` | Agenda first (missed / today / this week / later), month view, goal revision with history, sessions & exams. |
| Support | `/support` | Weekly prayer points, your coordinator, ways the committee helps. No stats. |
| Updates | `/updates` `/updates/[id]` `/assignments/[id]` | Announcements (pinned first, paginated) and assignments for your level/department. |
| Profile | `/profile` `/privacy` | Edit details, "who can see what", sign out, delete account. |
| Committee | `/admin` … | Participation by level + 8-week trend + CSV export; assignments (draft → publish → archive, audit trail, audience preview); announcements; prayer points; people & roles (chairman). |

## Set up (about 15 minutes)

1. **Supabase project** → SQL editor → run `supabase/migrations/001_init.sql`. Optionally run `supabase/seed.sql`.
2. **Auth settings** (Supabase → Authentication):
   - URL configuration: Site URL = your Vercel URL; add `https://<your-domain>/auth/callback` to Redirect URLs (and `http://localhost:3000/auth/callback` for dev).
   - Email: keep "Confirm email" on. **Set up custom SMTP (e.g. Resend) before the beta** — Supabase's built-in email is rate-limited to a handful per hour and will stall 1,000 sign-ups.
3. **Env vars** — copy `.env.example` to `.env.local` (and into Vercel → Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` — **server only**, used solely for "delete my account".
4. `npm install && npm run dev`
5. **Make the first chairman**: sign up in the app, then in the SQL editor:
   ```sql
   update public.profiles set role = 'chairman'
   where id = (select id from auth.users where email = 'chairman@example.com');
   ```
   From then on the chairman appoints coordinators in Committee → People and roles.
6. Deploy: push to GitHub → import in Vercel → add the env vars → deploy.

## Security model (enforced in the database, not the UI)

- RLS on every table. Members read/write only their own goals, sessions and check-ins (notes included).
- Coordinators publish only to their own level; the chairman to any level. Members can't change roles (trigger), the chairman can't demote themself.
- **Nobody** — chairman included — can select another member's check-ins. Participation comes only from `participation_by_level` / `participation_weekly` (security definer, counts only). Groups under 3 members show "—" in the dashboard and CSV so no individual can be singled out.
- Anonymous visitors have no table access at all.
- Service-role key only in `lib/supabase/server.js` (`server-only` import).

## Offline behaviour

- Service worker (`public/sw.js`): static assets cache-first; member pages network-first with last-seen fallback; `/offline` fallback; admin/auth never cached; page cache cleared on sign-out.
- Check-ins made offline are queued on the phone with a device-generated id and shown as **"Saved on this phone · not synced yet"** (dashed note on the stave). They sync on reconnect; `(user_id, day)` is unique so retries can't double count. A check-in can be up to 7 days late, never in the future (Lagos time).

## Tests

```bash
# RLS / permissions (37 checks) — needs a local Postgres 15+
PGURL=postgres://postgres@127.0.0.1:54329 npm run test:db

# End to end (40 checks): local Supabase stand-in + built app + headless Chromium
DATABASE_URL=postgres://…/tlv_e2e node tests/e2e/local-supabase.mjs --print-keys   # put keys in .env.local
npm run build && npm start
PG=postgres://…/tlv_e2e node tests/e2e/flows.mjs
```

`tests/e2e/local-supabase.mjs` is a **test-only** stand-in that speaks the Supabase Auth + PostgREST HTTP APIs this app uses and runs every query as the JWT's role with `request.jwt.claims`, so the real RLS policies decide access. Before launch, also click through once against the real Supabase project.

## Engineering notes (read before changing)

- **Don't add `loading.js` at the `(member)` group level, and don't call `revalidatePath` in actions that stay on the page.** Both caused streamed responses to be dropped in testing (buttons stuck on "Saving…" although the save worked). Forms that stay on the page use `useRefreshOnSuccess` / `RefreshingForm`; forms that leave the page `redirect()`. All pages are dynamic (they read the session cookie), so nothing needs revalidating.
- Submit buttons stay disabled until hydration (`useHydrated`) so a tap on a slow phone can't bypass validation or be lost.
- Publish buttons copy their intent into a hidden field; the server rejects a missing intent instead of guessing "draft". Inserts carry a `client_key` so a double tap creates one row.

## Before the beta

- [ ] Real Supabase project, custom SMTP, redirect URLs
- [ ] Chairman bootstrapped; five coordinators appointed
- [ ] Click-through on a real entry-level Android phone on 3G, including install to home screen and airplane-mode check-in
- [ ] Replace the sample department list in `components/ProfileFields.js` if needed
- [ ] Usability test with members from ≥3 levels (spec §10)
