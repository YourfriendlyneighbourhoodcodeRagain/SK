'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export function SignOutButton() {
  const router = useRouter();
  async function signOut() { await supabase.auth.signOut(); router.replace('/login'); router.refresh(); }

  return <button type="button" onClick={signOut} className="inline-flex items-center gap-2 rounded-md border border-green-500 px-3 py-2 text-sm font-semibold hover:bg-green-800" aria-label="Sign out"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign out</span></button>;
}