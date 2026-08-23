'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Download, ExternalLink, RefreshCw, ShieldCheck, ShieldX } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PortalShell } from '@/components/portal-shell';

type LabTest = { passed: boolean; residue_level_ppm: number; max_permissible_limit_ppm: number; lab_name: string; report_url: string | null; created_at: string };
type Handoff = { prev_hash: string | null; current_hash: string; created_at: string; stage: string; location: string | null; notes: string | null };
type Batch = {
  id: string; batch_code: string; crop_type: string; farm_location: string; status: string;
  is_recalled: boolean; created_at: string; lab_tests: LabTest[]; handoffs: Handoff[];
};

export default function RegulatorDashboard() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'recalls' | 'failed'>('all');
  const [labFilter, setLabFilter] = useState<'all' | 'passed' | 'pending' | 'failed'>('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [selectedBatchCode, setSelectedBatchCode] = useState('');
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
      .select('id, batch_code, crop_type, farm_location, status, is_recalled, created_at, lab_tests(passed, residue_level_ppm, max_permissible_limit_ppm, lab_name, report_url, created_at), handoffs(prev_hash, current_hash, created_at, stage, location, notes)')
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
    const matchesLocation = !locationFilter || batch.farm_location.toLowerCase().includes(locationFilter.toLowerCase());
    const matchesPrimaryFilter = filter === 'all' || (filter === 'recalls' && batch.is_recalled) || (filter === 'failed' && failedTest(batch));
    const matchesLab = labFilter === 'all' || (labFilter === 'pending' && batch.lab_tests.length === 0) || (labFilter === 'passed' && batch.lab_tests.length > 0 && !failedTest(batch)) || (labFilter === 'failed' && failedTest(batch));
    return matchesSearch && matchesLocation && matchesPrimaryFilter && matchesLab;
  });
  const recalls = batches.filter((batch) => batch.is_recalled).length;
  const failed = batches.filter(failedTest).length;
  const chainIssues = batches.filter(chainIssue).length;
  const pendingTests = batches.filter((batch) => batch.lab_tests.length === 0).length;
  const alertBatches = batches.filter((batch) => batch.is_recalled || failedTest(batch) || chainIssue(batch));
  const selectedBatch = visibleBatches.find((batch) => batch.batch_code === selectedBatchCode) ?? visibleBatches[0];

  const exportReport = () => {
    const rows = visibleBatches.map((batch) => [batch.batch_code, batch.crop_type, batch.farm_location, batch.status, batch.is_recalled ? 'Recalled' : 'Active', batch.lab_tests.length === 0 ? 'Pending' : failedTest(batch) ? 'Failed' : 'Passed'].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','));
    const file = new Blob([['Batch ID,Crop,Farm location,Status,Recall,Lab safety', ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(file); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'surakshakhadya-compliance-report.csv'; anchor.click(); URL.revokeObjectURL(url);
  };

  return (
    <PortalShell title="Regulator compliance console" description="Food safety oversight and traceability audit." icon={ShieldCheck}>
      <div className="space-y-6">
        <div className="flex justify-end"><Button onClick={() => void loadBatches()} disabled={loading} className="bg-green-700 hover:bg-green-800"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
        {message && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">{message}</div>}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Tracked batches" value={batches.length} icon={<ClipboardCheck className="text-green-700" />} />
          <StatCard label="Pending lab tests" value={pendingTests} icon={<ClipboardCheck className="text-amber-600" />} />
          <StatCard label="Active recalls" value={recalls} icon={<AlertTriangle className="text-red-600" />} tone="red" />
          <StatCard label="Failed lab tests" value={failed} icon={<ShieldX className="text-red-600" />} tone="red" />
          <StatCard label="Chain warnings" value={chainIssues} icon={<ShieldCheck className="text-green-700" />} />
        </section>

        <Card className="portal-surface"><CardContent className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-5"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Batch ID or crop" className="portal-field" /><Input value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} placeholder="Farm location / district" className="portal-field" /><select value={labFilter} onChange={(event) => setLabFilter(event.target.value as typeof labFilter)} className="portal-field h-9 rounded-lg px-3 text-sm"><option value="all">All lab outcomes</option><option value="passed">Lab passed</option><option value="pending">Lab pending</option><option value="failed">Lab failed</option></select><select value={selectedBatchCode} onChange={(event) => setSelectedBatchCode(event.target.value)} className="portal-field h-9 rounded-lg px-3 text-sm"><option value="">Select a visible batch</option>{visibleBatches.map((batch) => <option key={batch.id} value={batch.batch_code}>{batch.batch_code}</option>)}</select><Button onClick={exportReport} variant="outline" className="border-green-200 text-green-700 hover:bg-green-50"><Download className="mr-2 h-4 w-4" />Export report</Button></CardContent></Card>

        {alertBatches.length > 0 && <Card className="rounded-xl border border-red-200 bg-white shadow-sm"><CardHeader><CardTitle className="flex items-center text-red-800"><AlertTriangle className="mr-2 h-5 w-5" />Compliance alert queue</CardTitle></CardHeader><CardContent className="space-y-2">{alertBatches.slice(0, 5).map((batch) => <div key={batch.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm"><span className="font-mono font-semibold text-slate-900">{batch.batch_code}</span><span className="text-red-800">{batch.is_recalled ? 'Active recall' : failedTest(batch) ? 'Lab test failed' : 'Ledger review needed'}</span></div>)}</CardContent></Card>}

        <Card className="portal-surface">
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between"><CardTitle>Batch compliance register</CardTitle><div className="flex flex-wrap gap-2"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search batch, crop, location" className="portal-field w-56" /><Button className={filter === 'all' ? 'portal-action' : ''} variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All</Button><Button variant={filter === 'recalls' ? 'destructive' : 'outline'} onClick={() => setFilter('recalls')}>Recalls</Button><Button className={filter === 'failed' ? 'portal-action' : ''} variant={filter === 'failed' ? 'default' : 'outline'} onClick={() => setFilter('failed')}>Lab failures</Button></div></CardHeader>
          <CardContent>
            <Table><TableHeader><TableRow><TableHead>Batch</TableHead><TableHead>Source</TableHead><TableHead>Lab safety</TableHead><TableHead>Audit chain</TableHead><TableHead>Status</TableHead><TableHead>Trace</TableHead></TableRow></TableHeader><TableBody>
              {!loading && visibleBatches.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-slate-500">No matching batches found.</TableCell></TableRow>}
              {visibleBatches.map((batch) => <TableRow key={batch.id}><TableCell><p className="font-mono font-semibold">{batch.batch_code}</p><p className="text-xs text-slate-500">{batch.crop_type}</p></TableCell><TableCell>{batch.farm_location}</TableCell><TableCell>{batch.lab_tests.length === 0 ? <Badge variant="outline">Pending</Badge> : failedTest(batch) ? <Badge variant="destructive">Failed</Badge> : <Badge className="bg-emerald-600"><CheckCircle2 className="mr-1" />Passed</Badge>}</TableCell><TableCell>{chainIssue(batch) ? <Badge variant="destructive">Review needed</Badge> : <Badge variant="outline">{batch.handoffs.length} verified stages</Badge>}</TableCell><TableCell><Badge variant={batch.is_recalled ? 'destructive' : 'secondary'}>{batch.is_recalled ? 'RECALLED' : batch.status.replace('_', ' ').toUpperCase()}</Badge></TableCell><TableCell><Link href={`/trace/${encodeURIComponent(batch.batch_code)}`} className="inline-flex items-center text-sm font-medium text-green-700 hover:underline">Open <ExternalLink className="ml-1 h-3 w-3" /></Link></TableCell></TableRow>)}
            </TableBody></Table>
          </CardContent>
        </Card>

        {selectedBatch && <Card className="portal-surface"><CardHeader><CardTitle>Batch detail: {selectedBatch.batch_code}</CardTitle><p className="text-sm text-slate-600">Immutable handoffs are displayed for review only; past ledger records cannot be edited here.</p></CardHeader><CardContent className="grid gap-6 lg:grid-cols-2"><div><h3 className="mb-3 font-semibold text-slate-900">Trace timeline</h3><div className="space-y-3">{[...selectedBatch.handoffs].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((handoff, index) => <div key={`${handoff.current_hash}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3"><p className="font-medium capitalize text-slate-900">{handoff.stage} · {handoff.location ?? 'Location not recorded'}</p><p className="mt-1 text-xs text-slate-500">{new Date(handoff.created_at).toLocaleString()}</p>{handoff.notes && <p className="mt-2 text-sm text-slate-600">{handoff.notes}</p>}</div>)}</div></div><div><h3 className="mb-3 font-semibold text-slate-900">Residue testing & downstream review</h3><p className="mb-3 text-sm text-slate-600">Farm: {selectedBatch.farm_location}. Downstream retail locations: {selectedBatch.handoffs.filter((handoff) => handoff.stage === 'retail').map((handoff) => handoff.location).filter(Boolean).join(', ') || 'none recorded'}.</p><div className="space-y-3">{selectedBatch.lab_tests.length === 0 ? <p className="text-sm text-slate-500">No lab test is attached yet.</p> : selectedBatch.lab_tests.map((test, index) => <div key={`${test.lab_name}-${index}`} className="rounded-lg border border-green-100 p-3 text-sm"><p className="font-medium text-slate-900">{test.lab_name} · {test.passed ? 'Passed' : 'Failed'}</p><p className="mt-1 text-slate-600">{test.residue_level_ppm} ppm / limit {test.max_permissible_limit_ppm} ppm</p>{test.report_url && <a href={test.report_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-green-700 hover:underline">Open certificate <ExternalLink className="ml-1 h-3 w-3" /></a>}</div>)}</div></div></CardContent></Card>}
      </div>
    </PortalShell>
  );
}

function StatCard({ label, value, icon, tone = 'default' }: { label: string; value: number; icon: ReactNode; tone?: 'default' | 'red' }) {
  const toneClass = tone === 'red' ? 'border-red-200' : 'border-green-100';
  return <Card className={`rounded-xl ${toneClass} bg-white shadow-sm`}><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold text-slate-900">{value}</p></div>{icon}</CardContent></Card>;
}
