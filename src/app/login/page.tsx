'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Leaf } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PublicShell } from '@/components/portal-shell';

type Role = 'farmer' | 'aggregator' | 'distributor' | 'retailer' | 'regulator';
const roleRoutes: Record<Role, string> = { farmer: '/farmer', aggregator: '/aggregator', distributor: '/distributor', retailer: '/retailer', regulator: '/regulator' };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [uiError, setUiError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    setUiError('');
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) { setUiError(error.message); return; }
      if (!data.session || !data.user) { setUiError('Sign-in succeeded but no active session was created. Confirm your email, then try again.'); return; }
      const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      if (profileError || !profile || !(profile.role in roleRoutes)) { setUiError('Your account profile could not be loaded. Please contact an administrator.'); return; }
      router.replace(roleRoutes[profile.role as Role]);
      router.refresh();
    } catch (caughtError) {
      setUiError(caughtError instanceof Error ? caughtError.message : 'Unable to sign in. Please try again.');
    } finally { setLoading(false); }
  }

  return <PublicShell><Card className="portal-surface w-full max-w-md"><CardHeader className="text-center"><Link href="/" className="mx-auto flex items-center gap-2 text-green-700"><Leaf /><span className="text-xl font-bold">SurakshaKhadya</span></Link><CardTitle className="pt-4 text-2xl">Sign in</CardTitle><CardDescription>Access your food safety workspace.</CardDescription></CardHeader><CardContent><form onSubmit={handleSubmit} className="space-y-5">{uiError && <div role="alert" className="rounded-lg border-2 border-red-500 bg-red-100 p-4 font-semibold text-red-900">{uiError}</div>}<div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" className="portal-field" value={email} onChange={(event) => setEmail(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete="current-password" className="portal-field" value={password} onChange={(event) => setPassword(event.target.value)} required /></div><Button type="submit" disabled={loading} className="portal-action w-full py-6 text-lg">{loading ? 'Signing in…' : <>Sign in <ArrowRight className="ml-2" /></>}</Button></form><p className="mt-6 text-center text-sm text-slate-600">New to SurakshaKhadya? <Link href="/register" className="font-semibold text-green-700 hover:underline">Create an account</Link></p></CardContent></Card></PublicShell>;
}
