'use server';
import { redirect } from 'next/navigation';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase/server';
import { LEVELS } from '@/lib/constants';
import { resolveProgramme } from '@/lib/catalogue';

export async function updateProfile(_prev, formData) {
  const full_name = String(formData.get('full_name') || '').trim().replace(/\s+/g, ' ');
  const level = Number(formData.get('level'));
  const school_code = String(formData.get('school_code') || '');
  const programme_id = String(formData.get('programme_id') || '');
  const errors = {};
  if (full_name.length < 2 || full_name.length > 80) errors.full_name = 'Enter your name.';
  if (!LEVELS.includes(level)) errors.level = 'Choose your level.';
  if (!school_code) errors.school_code = 'Choose your school.';
  if (!programme_id) errors.programme_id = 'Choose your department or programme.';
  if (Object.keys(errors).length) return { errors };
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const programme = await resolveProgramme(supabase, school_code, programme_id);
  if (!programme) return { errors: { programme_id: 'Choose a programme from your school\'s list.' } };
  // Only these columns are sent; roles and committee scope are blocked in the database for non-admins.
  const { data, error } = await supabase.from('profiles')
    .update({ full_name, level, school_code, programme_id: programme.id, department: programme.name.slice(0, 80) })
    .eq('id', user.id).select('id').maybeSingle();
  if (error || !data) return { message: 'Couldn\'t save. Try again.' };
  return { ok: true, message: 'Profile saved.' };
}

export async function deleteAccount(_prev, formData) {
  if (String(formData.get('confirm') || '').trim().toUpperCase() !== 'DELETE') {
    return { errors: { confirm: 'Type DELETE to confirm.' } };
  }
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profileError || !profile) return { message: 'Couldn\'t verify your account. Try again later.' };
  if (profile?.role === 'chairman') {
    return { message: 'Make someone else admin before deleting this account.' };
  }
  try {
    // Deletes the auth user; profile, goals, sessions and check-ins cascade with it.
    const { error } = await getAdminSupabase().auth.admin.deleteUser(user.id);
    if (error) throw error;
  } catch {
    return { message: 'Couldn\'t delete your account right now. Ask the admin, or try again later.' };
  }
  await supabase.auth.signOut();
  redirect('/sign-in');
}
