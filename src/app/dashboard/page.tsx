'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, FlaskConical, Leaf, LogOut, MapPin, QrCode, ShieldAlert, Store, Truck } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Role = 'farmer' | 'aggregator' | 'distributor' | 'retailer' | 'regulator';
type Profile = { full_name: string; role: Role; location: string | null };

const roleLabels: Record<Role, string> = { farmer: 'Farmer', aggregator: 'Aggregator', distributor: 'Distributor', retailer: 'Retailer', regulator: 'Regulator' };

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadProfile(); }, 0);
    return () => window.clearTimeout(timer);
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const { data, error: profileError } = await supabase.from('profiles').select('full_name, role, location').eq('id', user.id).single();
      if (profileError || !data) { setError('Your account is authenticated, but its profile could not be loaded. Please contact an administrator.'); return; }
      setProfile(data as Profile);
    }
  }, [router]);

  async function signOut() { await supabase.auth.signOut(); router.replace('/login'); router.refresh(); }
  if (error) return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><Card className="max-w-lg border border-green-100 shadow-lg"><CardContent className="p-6"><p className="text-red-700">{error}</p><Button className="mt-4 bg-green-700 hover:bg-green-800" onClick={signOut}>Sign out</Button></CardContent></Card></main>;
  if (!profile) return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">Loading your dashboard…</main>;
  return <main className="min-h-screen bg-slate-50"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 p-4 md:px-6"><div><p className="text-sm text-slate-500">Welcome,</p><h1 className="text-xl font-bold text-slate-900">{profile.full_name}</h1><div className="mt-1 flex items-center gap-2"><Badge className="bg-green-700">{roleLabels[profile.role]}</Badge>{profile.location && <span className="flex items-center text-sm text-slate-500"><MapPin className="mr-1 h-3 w-3" />{profile.location}</span>}</div></div><Button variant="outline" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</Button></div></header><section className="mx-auto max-w-6xl p-4 md:p-6"><h2 className="mb-6 text-2xl font-bold text-slate-900">Your workspace</h2><RoleActions role={profile.role} /></section></main>;
}

function RoleActions({ role }: { role: Role }) {
  if (role === 'farmer') return <ActionCard title="Register a new harvest" description="Create a batch, record its farm origin, and generate a QR code." href="/farmer" icon={<Leaf className="h-8 w-8" />} color="bg-green-700 hover:bg-green-800" button="+ Register New Harvest Batch" />;
  if (role === 'aggregator') return <div className="grid gap-5 md:grid-cols-2"><ActionCard title="Receive farmer batch" description="Scan or enter a farmer batch and record quality notes." href="/aggregator" icon={<QrCode className="h-8 w-8" />} color="bg-green-700 hover:bg-green-800" button="Scan Farmer Batch" /><ActionCard title="Lab safety records" description="Attach pesticide residue and lab certificate results." href="/aggregator" icon={<FlaskConical className="h-8 w-8" />} color="bg-green-700 hover:bg-green-800" button="Attach Lab Residue Test" /></div>;
  if (role === 'distributor') return <ActionCard title="Log transport handoff" description="Record origin, destination, storage temperature, and transport notes." href="/distributor" icon={<Truck className="h-8 w-8" />} color="bg-green-700 hover:bg-green-800" button="Log Transport Handoff" />;
  if (role === 'retailer') return <div className="grid gap-5 md:grid-cols-2"><ActionCard title="Store shelf acceptance" description="Receive a batch at your store and generate a consumer QR code." href="/retailer" icon={<Store className="h-8 w-8" />} color="bg-green-700 hover:bg-green-800" button="Store Shelf Acceptance" /><ActionCard title="Safety recall" description="Immediately flag contaminated batches and begin a recall." href="/retailer" icon={<ShieldAlert className="h-8 w-8" />} color="bg-red-600 hover:bg-red-700" button="Trigger Contamination Recall" /></div>;
  return <ActionCard title="Compliance console" description="Review the complete batch register, lab safety outcomes, and recall alerts." href="/regulator" icon={<ClipboardCheck className="h-8 w-8" />} color="bg-green-700 hover:bg-green-800" button="Open Regulator Console" />;
}

function ActionCard({ title, description, href, icon, color, button }: { title: string; description: string; href: string; icon: React.ReactNode; color: string; button: string }) {
  return <Card className="border border-green-100 shadow-lg"><CardHeader><div className="mb-2 text-green-700">{icon}</div><CardTitle className="text-slate-900">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent><Button render={<Link href={href} />} className={`w-full py-4 text-lg font-bold ${color}`}>{button}</Button></CardContent></Card>;
}
