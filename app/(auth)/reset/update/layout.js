import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
export default async function PasswordUpdateLayout({ children }) {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) redirect('/reset');
  return children;
}
