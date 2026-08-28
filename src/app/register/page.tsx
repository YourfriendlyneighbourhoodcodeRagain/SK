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
export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState(''); const [role, setRole] = useState<Role>('farmer'); const [location, setLocation] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [uiError, setUiError] = useState(''); const [loading, setLoading] = useState(false);
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    setUiError(''); setLoading(true);
    const formData = { fullName, role, location, email, passwordLength: password.length };
    console.log('Submitting to Supabase...', formData);
    try {
      console.log('Calling supabase.auth.signUp');
      const { data, error } = await supabase.auth.signUp({ email, password });
      console.log('Supabase sign-up response:', { data, error });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('Supabase did not return a newly created user.');
      console.log('Calling profiles insert for:', data.user.id);
      const profileResponse = await supabase.from('profiles').insert([{ id: data.user.id, full_name: fullName, role: role.toLowerCase(), location }]);
      console.log('Supabase profile insert response:', profileResponse);
      if (profileResponse.error) throw new Error(profileResponse.error.message);
      if (!data.session) { setUiError('Account created. Please check your email to confirm your account before signing in.'); return; }
      router.push(roleRoutes[role]);
      router.refresh();
    } catch (caughtError) {
      console.error('Supabase registration exception:', caughtError);
      setUiError(caughtError instanceof Error ? caughtError.message : 'Unable to create account. Please try again.');
    } finally { setLoading(false); }
  }
  return <PublicShell><Card className="portal-surface w-full max-w-lg"><CardHeader className="text-center"><Link href="/" className="mx-auto flex items-center gap-2 text-green-700"><Leaf /><span className="text-xl font-bold">SurakshaKhadya</span></Link><CardTitle className="pt-4 text-2xl">Create your account</CardTitle><CardDescription>Join the food safety traceability network.</CardDescription></CardHeader><CardContent><form onSubmit={handleSubmit} className="space-y-4">{uiError && <div role="alert" className="rounded-lg border-2 border-red-500 bg-red-100 p-4 font-semibold text-red-900">{uiError}</div>}<Field label="Full name / organisation" id="fullName" value={fullName} setValue={setFullName} /><div className="space-y-2"><Label htmlFor="role">Role</Label><select id="role" value={role} onChange={(event) => setRole(event.target.value.toLowerCase() as Role)} className="portal-field h-10 w-full rounded-md px-3"><option value="farmer">Farmer</option><option value="aggregator">Aggregator</option><option value="distributor">Distributor</option><option value="retailer">Retailer</option><option value="regulator">Regulator</option></select></div><Field label="Location / district" id="location" value={location} setValue={setLocation} /><Field label="Email" id="email" type="email" value={email} setValue={setEmail} /><div className="space-y-2"><Label htmlFor="password">Password</Label><Input className="portal-field" id="password" type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required /></div><Button type="submit" disabled={loading} className="portal-action w-full py-6 text-lg">{loading ? 'Creating account…' : <>Create account <ArrowRight className="ml-2" /></>}</Button></form><p className="mt-6 text-center text-sm text-slate-600">Already have an account? <Link href="/login" className="font-semibold text-green-700 hover:underline">Sign in</Link></p></CardContent></Card></PublicShell>;
}
function Field({ label, id, type = 'text', value, setValue }: { label: string; id: string; type?: string; value: string; setValue: (value: string) => void }) { return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input className="portal-field" id={id} type={type} value={value} onChange={(event) => setValue(event.target.value)} required /></div>; }
