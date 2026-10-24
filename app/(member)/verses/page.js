import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { lagosToday, addDays, formatDay } from '@/lib/dates';
import { VERSES, verseIndexFor, describeVerse } from '@/lib/memory-verses';
import { VerseCard } from '@/components/VerseCard';
import { photoFor } from '@/lib/verse-photos';

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
              <li key={day} className="relative isolate overflow-hidden rounded-[var(--radius-control)] bg-ink text-white">
                <img src={photoFor(index).small} alt="" aria-hidden="true" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="absolute inset-0 -z-20 size-full object-cover" />
                <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[rgb(20_22_21/0.62)]" />
                <div className="grid gap-1.5 px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-xs text-white/80">{formatDay(day, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                    {memorised.has(verse.ref) && <span className="chip bg-sage-wash text-sage-ink">✓ Memorised</span>}
                  </div>
                  <p className="text-sm leading-relaxed">“{verse.text}”</p>
                  <p className="text-sm font-semibold">{verse.label} <span className="font-normal text-white/75">· WEB</span></p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">The list starts fresh each January. Earlier verses will appear here.</p>
        )}
      </section>

      <p className="text-xs text-muted">
        Scripture from the World English Bible (WEB), which is in the public domain. Photos from Unsplash.{' '}
        <Link href="/today" className="underline underline-offset-2">Back to Today</Link>
      </p>
    </div>
  );
}
