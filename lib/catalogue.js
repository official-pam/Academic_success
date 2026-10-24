import 'server-only';
import { cache } from 'react';

/** Schools and programmes from the FUT Minna catalogue (002 + seed_courses.sql), once per request. */
export const getDirectory = cache(async (supabase) => {
  const [schools, programmes] = await Promise.all([
    supabase.from('schools').select('code, name').order('name'),
    supabase.from('programmes').select('id, school_code, name').order('name'),
  ]);
  return {
    schools: schools.data || [],
    programmes: programmes.data || [],
    error: schools.error || programmes.error || null,
  };
});

/** Validates a school + programme pair from a form against the catalogue. */
export async function resolveProgramme(supabase, schoolCode, programmeId) {
  const id = Number(programmeId);
  if (!schoolCode || !Number.isInteger(id)) return null;
  const { data } = await supabase.from('programmes').select('id, school_code, name').eq('id', id).eq('school_code', schoolCode).maybeSingle();
  return data || null;
}

/** Short school label: "SEET · School of Engineering and Engineering Technology". */
export const schoolLabel = (s) => (s ? `${s.code} · ${s.name.replace(/\s*\(.*\)$/, '')}` : '');
