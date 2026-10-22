'use server';
import { safeNext } from '@/lib/auth-redirect';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getServerSupabase } from '@/lib/supabase/server';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  const h = await headers();
  return `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;
}

// Only allow redirects back into this app.

function friendly(error) {
  const m = (error?.message || '').toLowerCase();
  if (m.includes('invalid login')) return 'That email and password don\'t match. Check both, or reset your password.';
  if (m.includes('email not confirmed')) return 'Confirm your email first. The link is in your inbox (check spam too).';
  if (m.includes('already registered')) return 'An account with this email already exists. Sign in instead.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Wait a minute and try again.';
  if (m.includes('fetch') || m.includes('network')) return 'Couldn\'t reach the server. Check your connection and try again.';
  return 'Something went wrong. Try again in a moment.';
}

export async function signIn(_prev, formData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const errors = {};
  if (!EMAIL.test(email)) errors.email = 'Enter the email you signed up with.';
  if (!password) errors.password = 'Enter your password.';
  if (Object.keys(errors).length) return { errors, values: { email } };

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { message: friendly(error), values: { email } };
  redirect(safeNext(formData.get('next')));
}

export async function signUp(_prev, formData) {
  const full_name = String(formData.get('full_name') || '').trim().replace(/\s+/g, ' ');
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const errors = {};
  if (full_name.length < 2 || full_name.length > 80) errors.full_name = 'Enter your name as the committee knows you.';
  if (!EMAIL.test(email)) errors.email = 'Enter a valid email address.';
  if (password.length < 8) errors.password = 'Use at least 8 characters.';
  if (Object.keys(errors).length) return { errors, values: { full_name, email } };

  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name }, emailRedirectTo: `${await siteUrl()}/auth/callback?next=/onboarding` },
  });
  if (error) return { message: friendly(error), values: { full_name, email } };
  if (data.session) redirect('/onboarding');
  return { ok: true, confirmEmail: email };
}

export async function requestReset(_prev, formData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  if (!EMAIL.test(email)) return { errors: { email: 'Enter the email you signed up with.' } };
  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/reset/update`,
  });
  // Same answer whether or not the account exists, so the form can't be used to probe emails.
  if (error && !/rate/i.test(error.message)) return { ok: true, message: 'If that email has an account, a reset link is on its way.' };
  if (error) return { message: friendly(error) };
  return { ok: true, message: 'If that email has an account, a reset link is on its way.' };
}

export async function updatePassword(_prev, formData) {
  const password = String(formData.get('password') || '');
  if (password.length < 8) return { errors: { password: 'Use at least 8 characters.' } };
  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { message: /session/i.test(error.message) ? 'This reset link has expired. Request a new one.' : friendly(error) };
  redirect('/today');
}

export async function signOut() {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  redirect('/sign-in');
}
