'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Leaf, Lock, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PublicShell } from '@/components/portal-shell';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [isSubmitting, setIsSubmitting] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setIsSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);
    if (signInError) { setError(signInError.message === 'Invalid login credentials' ? 'Invalid email or password. Please try again.' : signInError.message); return; }
    router.replace('/dashboard'); router.refresh();
  }
  return <PublicShell><Card className="portal-surface w-full max-w-md"><CardHeader className="text-center"><Link href="/" className="mx-auto flex items-center gap-2 text-green-700"><Leaf /><span className="text-xl font-bold">SurakshaKhadya</span></Link><CardTitle className="pt-4 text-2xl">Sign in</CardTitle><CardDescription>Access your food safety workspace.</CardDescription></CardHeader><CardContent><form onSubmit={handleSubmit} className="space-y-5">{error && <p role="alert" className="portal-status-error p-3 text-sm">{error}</p>}<div className="space-y-2"><Label htmlFor="email">Email</Label><div className="relative"><Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input id="email" type="email" autoComplete="email" className="portal-field pl-9" value={email} onChange={(event) => setEmail(event.target.value)} required /></div></div><div className="space-y-2"><Label htmlFor="password">Password</Label><div className="relative"><Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input id="password" type="password" autoComplete="current-password" className="portal-field pl-9" value={password} onChange={(event) => setPassword(event.target.value)} required /></div></div><Button type="submit" disabled={isSubmitting} className="portal-action w-full py-6 text-lg">{isSubmitting ? 'Signing in…' : <>Sign in <ArrowRight className="ml-2" /></>}</Button></form><p className="mt-6 text-center text-sm text-slate-600">New to SurakshaKhadya? <Link href="/register" className="font-semibold text-green-700 hover:underline">Create an account</Link></p></CardContent></Card></PublicShell>;
}
