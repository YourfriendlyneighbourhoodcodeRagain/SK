'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ClipboardCheck, ExternalLink, RefreshCw, ShieldCheck, ShieldX } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type LabTest = { passed: boolean; residue_level_ppm: number; max_permissible_limit_ppm: number };
type Handoff = { prev_hash: string | null; current_hash: string; created_at: string };
type Batch = {
  id: string; batch_code: string; crop_type: string; farm_location: string; status: string;
  is_recalled: boolean; created_at: string; lab_tests: LabTest[]; handoffs: Handoff[];
};

export default function RegulatorDashboard() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'recalls' | 'failed'>('all');
  const [message, setMessage] = useState('Loading compliance records…');
  const [loading, setLoading] = useState(true);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) {
      setMessage('Sign in with a regulator account to view the compliance dashboard.');
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    if (profile?.role !== 'regulator') {
      setMessage('This dashboard is available to regulator accounts only.');
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('batches')
      .select('id, batch_code, crop_type, farm_location, status, is_recalled, created_at, lab_tests(passed, residue_level_ppm, max_permissible_limit_ppm), handoffs(prev_hash, current_hash, created_at)')
      .order('created_at', { ascending: false });
    if (error) setMessage(error.message);
    else {
      setBatches((data ?? []) as Batch[]);
      setMessage('');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadBatches(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadBatches]);

  const failedTest = (batch: Batch) => batch.lab_tests.some((test) => !test.passed);
  const chainIssue = (batch: Batch) => [...batch.handoffs].sort((a, b) => a.created_at.localeCompare(b.created_at)).some((handoff, index, ordered) =>
    !handoff.current_hash || (index > 0 && handoff.prev_hash !== ordered[index - 1].current_hash));
  const visibleBatches = batches.filter((batch) => {
    const matchesSearch = `${batch.batch_code} ${batch.crop_type} ${batch.farm_location}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (filter === 'all' || (filter === 'recalls' && batch.is_recalled) || (filter === 'failed' && failedTest(batch)));
  });
  const recalls = batches.filter((batch) => batch.is_recalled).length;
  const failed = batches.filter(failedTest).length;
  const chainIssues = batches.filter(chainIssue).length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <header className="mx-auto mb-6 flex max-w-6xl items-center justify-between rounded-xl bg-slate-900 p-5 text-white shadow">
        <div className="flex items-center gap-3"><ShieldCheck className="h-8 w-8 text-emerald-400" /><div><h1 className="text-2xl font-bold">Regulator Compliance Console</h1><p className="text-sm text-slate-300">Food safety oversight and traceability audit</p></div></div>
        <Button onClick={() => void loadBatches()} disabled={loading} variant="secondary"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </header>

      <main className="mx-auto max-w-6xl space-y-6">
        {message && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">{message}</div>}
        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="Tracked batches" value={batches.length} icon={<ClipboardCheck className="text-blue-600" />} />
          <StatCard label="Active recalls" value={recalls} icon={<AlertTriangle className="text-red-600" />} tone="red" />
          <StatCard label="Failed lab tests" value={failed} icon={<ShieldX className="text-amber-600" />} tone="amber" />
          <StatCard label="Chain warnings" value={chainIssues} icon={<ShieldCheck className="text-purple-600" />} tone="purple" />
        </section>

        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between"><CardTitle>Batch compliance register</CardTitle><div className="flex flex-wrap gap-2"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search batch, crop, location" className="w-56" /><Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All</Button><Button variant={filter === 'recalls' ? 'destructive' : 'outline'} onClick={() => setFilter('recalls')}>Recalls</Button><Button variant={filter === 'failed' ? 'default' : 'outline'} onClick={() => setFilter('failed')}>Lab failures</Button></div></CardHeader>
          <CardContent>
            <Table><TableHeader><TableRow><TableHead>Batch</TableHead><TableHead>Source</TableHead><TableHead>Lab safety</TableHead><TableHead>Audit chain</TableHead><TableHead>Status</TableHead><TableHead>Trace</TableHead></TableRow></TableHeader><TableBody>
              {!loading && visibleBatches.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-slate-500">No matching batches found.</TableCell></TableRow>}
              {visibleBatches.map((batch) => <TableRow key={batch.id}><TableCell><p className="font-mono font-semibold">{batch.batch_code}</p><p className="text-xs text-slate-500">{batch.crop_type}</p></TableCell><TableCell>{batch.farm_location}</TableCell><TableCell>{batch.lab_tests.length === 0 ? <Badge variant="outline">Pending</Badge> : failedTest(batch) ? <Badge variant="destructive">Failed</Badge> : <Badge className="bg-emerald-600"><CheckCircle2 className="mr-1" />Passed</Badge>}</TableCell><TableCell>{chainIssue(batch) ? <Badge variant="destructive">Review needed</Badge> : <Badge variant="outline">{batch.handoffs.length} verified stages</Badge>}</TableCell><TableCell><Badge variant={batch.is_recalled ? 'destructive' : 'secondary'}>{batch.is_recalled ? 'RECALLED' : batch.status.replace('_', ' ').toUpperCase()}</Badge></TableCell><TableCell><Link href={`/trace/${encodeURIComponent(batch.batch_code)}`} className="inline-flex items-center text-sm font-medium text-green-700 hover:underline">Open <ExternalLink className="ml-1 h-3 w-3" /></Link></TableCell></TableRow>)}
            </TableBody></Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, tone = 'default' }: { label: string; value: number; icon: ReactNode; tone?: 'default' | 'red' | 'amber' | 'purple' }) {
  const toneClass = { default: 'border-slate-200', red: 'border-red-200', amber: 'border-amber-200', purple: 'border-purple-200' }[tone];
  return <Card className={toneClass}><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></div>{icon}</CardContent></Card>;
}
