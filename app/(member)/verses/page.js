import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { lagosToday, addDays, formatDay } from '@/lib/dates';
import { VERSES, verseIndexFor, describeVerse } from '@/lib/memory-verses';
import { VerseCard } from '@/components/VerseCard';
import { VerseBackground, themeFor } from '@/components/VerseBackground';

export const metadata = { title: 'Memory verses' };

const DAYS_SHOWN = 30;

export default async function VersesPage() {
  const { supabase } = await requireMember();
  const today = lagosToday();
  const todayIndex = verseIndexFor(today);

  // Past days stay within this calendar year's list (the list restarts on 1 January).
  const past = [];
  for (let i = 1; i <= DAYS_SHOWN; i++) {
    const day = addDays(today, -i);
    if (day.slice(0, 4) !== today.slice(0, 4)) break;
    const index = verseIndexFor(day);
    past.push({ day, index, verse: describeVerse(VERSES[index]) });
  }

  const { data, error } = await supabase.from('memorised_verses').select('verse_ref');
  const memorised = new Set((data || []).map((r) => r.verse_ref));
  const todayVerse = describeVerse(VERSES[todayIndex]);

  return (
    <div className="grid max-w-xl gap-8">
      <div>
        <p className="eyebrow">Hide it in your heart</p>
        <h1 className="display mt-2 text-[2.25rem] leading-[1.08]">Memory verses</h1>
        <p className="mt-2 text-sm text-muted">
          One verse a day. {memorised.size > 0 ? `You've memorised ${memorised.size} so far.` : 'Mark each one when you know it by heart.'} Only you can see this.
        </p>
      </div>

      {error && <p role="alert" className="notice">Couldn't load your memorised verses. They're safe; try again shortly.</p>}

      <VerseCard verse={todayVerse} index={todayIndex} memorised={memorised.has(todayVerse.ref)} showPastLink={false} />

      <section aria-labelledby="past-heading" className="grid gap-3">
        <h2 id="past-heading" className="text-base font-bold">Earlier this month</h2>
        {past.length ? (
          <ul className="grid gap-3">
            {past.map(({ day, index, verse }) => (
              <li key={day} className="relative overflow-hidden rounded-[var(--radius-control)]">
                <VerseBackground theme={themeFor(index)} compact />
                <div className="relative flex items-center gap-3 px-4 py-3 pr-20">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted">{formatDay(day, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                    <p className="font-semibold">{verse.label}</p>
                    <p className="mt-1 flex gap-3 text-xs font-semibold">
                      <a href={verse.nkjv} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">NKJV</a>
                      <a href={verse.niv} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">NIV</a>
                    </p>
                  </div>
                  {memorised.has(verse.ref) && <span className="chip bg-surface/90 text-sage-ink">✓ Memorised</span>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">The list starts fresh each January. Earlier verses will appear here.</p>
        )}
      </section>

      <p className="text-xs text-muted">
        Verses open on Bible.com. NKJV © Thomas Nelson; NIV © Biblica, Inc. <Link href="/today" className="underline underline-offset-2">Back to Today</Link>
      </p>
    </div>
  );
}
