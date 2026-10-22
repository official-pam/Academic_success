'use client';
import { useActionState, useMemo } from 'react';
import { saveAnnouncement } from '@/app/admin/announcements/actions';
import { savePrayerPoints } from '@/app/admin/prayer-points/actions';
import { SubmitButton, FormMessage, FieldError, invalid } from '@/components/forms';
import { LEVELS, levelLabel } from '@/lib/constants';

function useClientKey() {
  return useMemo(() => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ''), []);
}

function Actions({ state, published }) {
  return (
    <div className="grid gap-3">
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-3">
        <SubmitButton name="intent" value="publish" pendingLabel="Publishing…">{published ? 'Save and keep published' : 'Publish'}</SubmitButton>
        {!published && <SubmitButton name="intent" value="draft" pendingLabel="Saving…" className="btn btn-outline">Save as draft</SubmitButton>}
      </div>
    </div>
  );
}

export function AnnouncementForm({ item, profile }) {
  const [state, action] = useActionState(saveAnnouncement, null);
  const key = useClientKey();
  const v = state?.values || { title: item?.title || '', body: item?.body || '', level: item ? String(item.level ?? 'all') : 'all', pinned: item?.pinned || false };
  const coordinator = profile.role === 'coordinator';
  return (
    <form action={action} className="grid max-w-2xl gap-5" noValidate>
      <input type="hidden" name="id" value={item?.id || ''} />
      <input type="hidden" name="client_key" value={key} />
      <div className="field">
        <label htmlFor="title" className="label">Title</label>
        <input id="title" name="title" defaultValue={v.title} maxLength={140} className="input" {...invalid(state, 'title')} />
        <FieldError state={state} name="title" />
      </div>
      <div className="field">
        <label htmlFor="body" className="label">Message</label>
        <textarea id="body" name="body" rows={8} defaultValue={v.body} maxLength={4000} className="input" {...invalid(state, 'body')} />
        <p className="hint">Leave a blank line between paragraphs. Links work. Never include anyone's grades or private details.</p>
        <FieldError state={state} name="body" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="level" className="label">Who sees it</label>
          {coordinator ? (
            <><input type="hidden" name="level" value={profile.coordinator_level} /><p id="level" className="input flex items-center bg-paper">{levelLabel(profile.coordinator_level)}</p></>
          ) : (
            <select id="level" name="level" defaultValue={v.level} className="input">
              <option value="all">All levels</option>
              {LEVELS.map((l) => <option key={l} value={l}>{l}L</option>)}
            </select>
          )}
          <FieldError state={state} name="level" />
        </div>
        <label className="flex min-h-11 items-center gap-3 self-end text-sm font-semibold">
          <input type="checkbox" name="pinned" defaultChecked={v.pinned} className="size-5 accent-[#20221f]" />
          Pin to the top of Updates
        </label>
      </div>
      <Actions state={state} published={item?.status === 'published'} />
    </form>
  );
}

export function PrayerForm({ item, thisMonday }) {
  const [state, action] = useActionState(savePrayerPoints, null);
  const key = useClientKey();
  const v = state?.values || { week_of: item?.week_of || thisMonday, points: (item?.points || []).join('\n'), scripture: item?.scripture || '' };
  return (
    <form action={action} className="grid max-w-2xl gap-5" noValidate>
      <input type="hidden" name="id" value={item?.id || ''} />
      <input type="hidden" name="client_key" value={key} />
      <div className="field">
        <label htmlFor="week_of" className="label">Week of</label>
        <input id="week_of" name="week_of" type="date" defaultValue={v.week_of} className="input max-w-56" {...invalid(state, 'week_of')} />
        <p className="hint">Any day works; it's saved as that week's Monday.</p>
        <FieldError state={state} name="week_of" />
      </div>
      <div className="field">
        <label htmlFor="points" className="label">Prayer points <span className="font-normal text-muted">(one per line)</span></label>
        <textarea id="points" name="points" rows={8} defaultValue={v.points} className="input" {...invalid(state, 'points')} />
        <FieldError state={state} name="points" />
      </div>
      <div className="field">
        <label htmlFor="scripture" className="label">Scripture <span className="font-normal text-muted">(optional)</span></label>
        <input id="scripture" name="scripture" defaultValue={v.scripture} maxLength={200} className="input" placeholder="Philippians 4:13" {...invalid(state, 'scripture')} />
        <FieldError state={state} name="scripture" />
      </div>
      <Actions state={state} published={item?.status === 'published'} />
    </form>
  );
}
