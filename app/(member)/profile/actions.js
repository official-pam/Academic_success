'use server';
import { redirect } from 'next/navigation';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase/server';
import { LEVELS } from '@/lib/constants';

export async function updateProfile(_prev, formData) {
  const full_name = String(formData.get('full_name') || '').trim().replace(/\s+/g, ' ');
  const level = Number(formData.get('level'));
  const department = String(formData.get('department') || '').trim().replace(/\s+/g, ' ');
  const errors = {};
  if (full_name.length < 2 || full_name.length > 80) errors.full_name = 'Enter your name.';
  if (!LEVELS.includes(level)) errors.level = 'Choose your level.';
  if (department.length < 2 || department.length > 80) errors.department = 'Enter your department.';
  if (Object.keys(errors).length) return { errors };
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  // Only these three columns are sent; role changes are also blocked in the database.
  const { data, error } = await supabase.from('profiles').update({ full_name, level, department }).eq('id', user.id).select('id').maybeSingle();
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
    return { message: 'Hand the chairman role to someone else before deleting this account.' };
  }
  try {
    // Deletes the auth user; profile, goals, sessions and check-ins cascade with it.
    const { error } = await getAdminSupabase().auth.admin.deleteUser(user.id);
    if (error) throw error;
  } catch {
    return { message: 'Couldn\'t delete your account right now. Ask the chairman, or try again later.' };
  }
  await supabase.auth.signOut();
  redirect('/sign-in');
}
