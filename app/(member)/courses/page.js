import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { levelLabel } from '@/lib/constants';

export const metadata = { title: 'Courses' };

// Phase 1 placeholder: the course catalogue, selection and course pages arrive in Phase 2.
// This is a real empty state, not a fake list, so nothing here pretends to be data.
export default async function CoursesPage() {
  const { profile } = await requireMember();
  return (
    <div className="grid max-w-xl gap-8">
      <div>
        <p className="eyebrow">{profile.department ? `${profile.department} · ` : ''}{levelLabel(profile.level)}</p>
        <h1 className="display mt-2 text-[2.25rem] leading-[1.08]">Your courses.</h1>
        <p className="mt-3 text-base text-muted">
          View your registered courses, track progress and open learning materials in one place.
        </p>
      </div>

      <section className="card-lavender grid gap-4 p-6" aria-labelledby="courses-soon">
        <span className="icon-tile bg-surface text-lavender-ink">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M12 4 3 8.5l9 4.5 9-4.5zM3 12.5l9 4.5 9-4.5M3 16.5 12 21l9-4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div>
          <h2 id="courses-soon" className="text-lg font-bold">Courses are on the way</h2>
          <p className="mt-1 text-sm">
            The committee is adding FUT Minna course lists for each department and level. Once your
            department's list is approved you'll confirm your registered courses here.
          </p>
        </div>
        <p className="text-sm text-lavender-ink">Until then, plan your reading by course title in Plan.</p>
        <Link href="/plan#add" className="btn btn-accent justify-self-start">
          Add a study session <span aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  );
}
