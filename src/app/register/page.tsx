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

type Role = 'farmer' | 'aggregator' | 'distributor' | 'retailer';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState(''); const [role, setRole] = useState<Role>('farmer'); const [location, setLocation] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [isSubmitting, setIsSubmitting] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setNotice(''); setIsSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, role, location } } });
    if (signUpError || !data.user) { setError(signUpError?.message ?? 'Could not create your account.'); setIsSubmitting(false); return; }
    // Upsert is safe with the database signup trigger in schema.sql and supports projects without it.
    if (data.session) {
      const { error: profileError } = await supabase.from('profiles').upsert({ id: data.user.id, full_name: fullName, role, location }, { onConflict: 'id' });
      if (profileError) { setError(`Account created, but profile setup failed: ${profileError.message}`); setIsSubmitting(false); return; }
      router.replace('/dashboard'); router.refresh(); return;
    }
    setNotice('Account created. Check your email to confirm your account, then sign in.'); setIsSubmitting(false);
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 py-10"><Card className="w-full max-w-lg border-slate-200 shadow-xl"><CardHeader className="text-center"><Link href="/" className="mx-auto flex items-center gap-2 text-green-700"><Leaf /><span className="text-xl font-bold">SurakshaKhadya</span></Link><CardTitle className="pt-4 text-2xl">Create your account</CardTitle><CardDescription>Join the food safety traceability network.</CardDescription></CardHeader><CardContent><form onSubmit={handleSubmit} className="space-y-4">{error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}<div className="space-y-2"><Label htmlFor="fullName">Full name / organisation</Label><Input id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="role">Role</Label><select id="role" value={role} onChange={(event) => setRole(event.target.value as Role)} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="farmer">Farmer</option><option value="aggregator">Aggregator</option><option value="distributor">Distributor</option><option value="retailer">Retailer</option></select></div><div className="space-y-2"><Label htmlFor="location">Location / district</Label><Input id="location" value={location} onChange={(event) => setLocation(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete="new-password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required /><p className="text-xs text-slate-500">At least 6 characters.</p></div><Button type="submit" disabled={isSubmitting} className="w-full bg-green-700 py-6 text-lg hover:bg-green-800">{isSubmitting ? 'Creating account…' : <>Create account <ArrowRight className="ml-2" /></>}</Button></form><p className="mt-6 text-center text-sm text-slate-600">Already have an account? <Link href="/login" className="font-semibold text-green-700 hover:underline">Sign in</Link></p></CardContent></Card></main>;
}
