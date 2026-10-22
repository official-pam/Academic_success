-- Optional starter content so the app isn't empty on day one. Safe to edit or skip.
insert into public.announcements (title, body, status, pinned)
values ('Welcome to TLV Academic',
        'Record your daily reading with one tap on Today. Your check-ins and notes are private to you; the committee only sees totals per level.

Questions? Talk to your level coordinator (listed under Support).',
        'published', true);

insert into public.prayer_points (week_of, points, scripture, status)
values (public.lagos_today() - (extract(isodow from public.lagos_today())::int - 1),
        array['For focus and consistency in our daily reading',
              'For members preparing for tests and exams this week',
              'For wisdom and grace for our level coordinators'],
        'James 1:5', 'published');
