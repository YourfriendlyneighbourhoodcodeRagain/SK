'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, FlaskConical, QrCode, ScanLine, Search, Send } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getAuthenticatedActor } from '@/lib/blockchain';
import { PortalShell } from '@/components/portal-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Workflow = 'receive' | 'lab' | 'sell';
type LookupMode = 'scan' | 'manual';
type Batch = { id: string; batch_code: string; crop_name: string; farm_location: string; harvest_date: string; total_weight_kg: number; status: string; is_recalled: boolean };
type Distributor = { id: string; full_name: string; location: string | null };

export default function AggregatorDashboard() {
  const [workflow, setWorkflow] = useState<Workflow>('receive');
  const [receiveMode, setReceiveMode] = useState<LookupMode>('scan');
  const [labMode, setLabMode] = useState<LookupMode>('scan');
  const [sellMode, setSellMode] = useState<LookupMode>('scan');
  const [receiveCode, setReceiveCode] = useState('');
  const [labCode, setLabCode] = useState('');
  const [sellCode, setSellCode] = useState('');
  const [receiveBatch, setReceiveBatch] = useState<Batch | null>(null);
  const [labBatch, setLabBatch] = useState<Batch | null>(null);
  const [sellBatch, setSellBatch] = useState<Batch | null>(null);
  const [notes, setNotes] = useState('');
  const [labName, setLabName] = useState('');
  const [residueLevel, setResidueLevel] = useState('');
  const [maxLimit, setMaxLimit] = useState('');
  const [reportUrl, setReportUrl] = useState('');
  const [passed, setPassed] = useState(true);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [previousDistributors, setPreviousDistributors] = useState<string[]>([]);
  const [distributorChoice, setDistributorChoice] = useState('new');
  const [newDistributor, setNewDistributor] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState<'receiveLookup' | 'labLookup' | 'sellLookup' | 'receiveSubmit' | 'labSubmit' | 'sellSubmit' | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadDistributors(); }, 0);
    return () => window.clearTimeout(timer);
    async function loadDistributors() {
      const [{ data: profiles }, { data: handoffs }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, location').eq('role', 'distributor').order('full_name'),
        supabase.from('batch_handoffs').select('assigned_distributor_name').eq('stage', 'distribution').not('assigned_distributor_name', 'is', null),
      ]);
      setDistributors((profiles ?? []) as Distributor[]);
      setPreviousDistributors([...new Set((handoffs ?? []).map((handoff) => handoff.assigned_distributor_name).filter((name): name is string => Boolean(name)))]);
    }
  }, []);

  async function lookupBatch(code: string, target: 'receive' | 'lab' | 'sell') {
    setLookupError(''); setStatus(null);
    const cleanCode = code.trim();
    if (!cleanCode) { setLookupError('Enter or scan a batch ID first.'); return; }
    setLoading(target === 'receive' ? 'receiveLookup' : target === 'lab' ? 'labLookup' : 'sellLookup');
    const { data, error } = await supabase.from('batches').select('id, batch_code, crop_name, farm_location, harvest_date, total_weight_kg, status, is_recalled').eq('batch_code', cleanCode).single();
    setLoading(null);
    if (error || !data) { setLookupError('Batch not found. Check the batch ID and try again.'); return; }
    if (target === 'sell') {
      if (data.status !== 'received_by_aggregator') { setLookupError('Only batches received by your hub can be sold to a distributor.'); return; }
      const { data: passedTests } = await supabase.from('lab_tests').select('id').eq('batch_id', data.id).eq('test_status', 'PASS').limit(1);
      if (!passedTests?.length) { setLookupError('This batch needs a passing lab test before it can be sold.'); return; }
    }
    if (target === 'receive') setReceiveBatch(data as Batch);
    if (target === 'lab') setLabBatch(data as Batch);
    if (target === 'sell') setSellBatch(data as Batch);
  }

  async function receiveBatchAtHub(event: React.FormEvent) {
    event.preventDefault();
    if (!receiveBatch) { setLookupError('Find the farmer batch before receiving it.'); return; }
    if (receiveBatch.is_recalled) { setLookupError('This batch is recalled and cannot be received.'); return; }
    setStatus(null); setLoading('receiveSubmit');
    try {
      const user = await getAuthenticatedActor();
      const { error: updateError } = await supabase.from('batches').update({ status: 'received_by_aggregator' }).eq('id', receiveBatch.id);
      if (updateError) throw updateError;
      const { error: handoffError } = await supabase.from('batch_handoffs').insert([{ batch_id: receiveBatch.id, handler_id: user.id, stage: 'aggregation', notes }]);
      if (handoffError) throw handoffError;
      setStatus({ type: 'success', text: `${receiveBatch.batch_code} was received and recorded.` });
      setReceiveBatch(null); setReceiveCode(''); setNotes('');
    } catch (error) { setStatus({ type: 'error', text: error instanceof Error ? error.message : 'Could not receive this batch.' }); }
    finally { setLoading(null); }
  }

  async function attachLabTest(event: React.FormEvent) {
    event.preventDefault();
    if (!labBatch) { setLookupError('Find the batch before attaching a lab test.'); return; }
    if (labBatch.is_recalled) { setLookupError('This batch is recalled and cannot receive a new lab test.'); return; }
    setStatus(null); setLoading('labSubmit');
    try {
      const user = await getAuthenticatedActor();
      const { error } = await supabase.from('lab_tests').insert([{ batch_id: labBatch.id, tester_id: user.id, lab_name: labName, residue_ppm: parseFloat(residueLevel), max_limit_ppm: parseFloat(maxLimit), test_status: passed ? 'PASS' : 'FAIL', certificate_url: reportUrl || null }]);
      if (error) throw error;
      setStatus({ type: 'success', text: `Lab results were attached to ${labBatch.batch_code}.` });
      setLabBatch(null); setLabCode(''); setLabName(''); setResidueLevel(''); setMaxLimit(''); setReportUrl(''); setPassed(true);
    } catch (error) { setStatus({ type: 'error', text: error instanceof Error ? error.message : 'Could not attach the lab test.' }); }
    finally { setLoading(null); }
  }

  async function sellBatchToDistributor(event: React.FormEvent) {
    event.preventDefault();
    if (!sellBatch) { setLookupError('Find the batch before selling it.'); return; }
    const recipient = distributorChoice === 'new' ? newDistributor.trim() : distributorChoice;
    if (!recipient) { setLookupError('Choose a distributor or enter a new distributor name.'); return; }
    setStatus(null); setLoading('sellSubmit');
    try {
      const user = await getAuthenticatedActor();
      const { error: updateError } = await supabase.from('batches').update({ status: 'in_transit' }).eq('id', sellBatch.id);
      if (updateError) throw updateError;
      const { error: handoffError } = await supabase.from('batch_handoffs').insert([{ batch_id: sellBatch.id, handler_id: user.id, stage: 'distribution', assigned_distributor_name: recipient, notes: saleNotes.trim() || `Sold to ${recipient}` }]);
      if (handoffError) throw handoffError;
      setStatus({ type: 'success', text: `${sellBatch.batch_code} was sold to ${recipient} and marked in transit.` });
      setSellBatch(null); setSellCode(''); setDistributorChoice('new'); setNewDistributor(''); setSaleNotes('');
    } catch (error) { setStatus({ type: 'error', text: error instanceof Error ? error.message : 'Could not sell this batch.' }); }
    finally { setLoading(null); }
  }

  return <PortalShell title="Aggregator quality hub" description="Receive farmer batches and attach pesticide-residue test records." icon={ClipboardCheck}>
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <WorkflowButton active={workflow === 'receive'} icon={<QrCode />} title="Receive farmer batch" description="Verify a farmer batch and record its arrival." onClick={() => setWorkflow('receive')} />
      <WorkflowButton active={workflow === 'lab'} icon={<FlaskConical />} title="Attach lab residue test" description="Link a pesticide-residue report to a batch." onClick={() => setWorkflow('lab')} />
      <WorkflowButton active={workflow === 'sell'} icon={<Send />} title="Sell to distributor" description="Choose a registered partner, a previous buyer, or add a new one." onClick={() => setWorkflow('sell')} />
    </div>
    {status && <div role="status" className={`mb-6 p-4 ${status.type === 'success' ? 'portal-status-success' : 'portal-status-error'}`}>{status.text}</div>}
    {lookupError && <div role="alert" className="portal-status-error mb-6 p-4">{lookupError}</div>}
    {workflow === 'sell' ? <SellWorkflow mode={sellMode} onModeChange={setSellMode} code={sellCode} onCodeChange={(value) => { setSellCode(value); setSellBatch(null); }} onLookup={() => void lookupBatch(sellCode, 'sell')} loading={loading === 'sellLookup'} batch={sellBatch} distributors={distributors} previousDistributors={previousDistributors} choice={distributorChoice} onChoiceChange={setDistributorChoice} newDistributor={newDistributor} onNewDistributorChange={setNewDistributor} notes={saleNotes} onNotesChange={setSaleNotes} onSubmit={sellBatchToDistributor} submitting={loading === 'sellSubmit'} /> : workflow === 'receive' ? <Card className="portal-surface"><CardHeader><CardTitle>Receive farmer batch</CardTitle><CardDescription>Identify the batch, review its details, then confirm receipt.</CardDescription></CardHeader><CardContent className="space-y-6"><BatchLookup mode={receiveMode} onModeChange={setReceiveMode} code={receiveCode} onCodeChange={(value) => { setReceiveCode(value); setReceiveBatch(null); }} onLookup={() => void lookupBatch(receiveCode, 'receive')} loading={loading === 'receiveLookup'} batch={receiveBatch} />{receiveBatch && <form onSubmit={receiveBatchAtHub} className="space-y-4 border-t border-green-100 pt-6"><div><Label htmlFor="quality-notes">Quality and quantity notes</Label><Input id="quality-notes" className="portal-field mt-2" placeholder="Example: Sorted and received in good condition" value={notes} onChange={(event) => setNotes(event.target.value)} required /></div><Button type="submit" disabled={loading === 'receiveSubmit'} className="portal-action w-full py-5 text-base">{loading === 'receiveSubmit' ? 'Receiving batch…' : 'Confirm receipt'}</Button></form>}</CardContent></Card> : <Card className="portal-surface"><CardHeader><CardTitle>Attach lab residue test</CardTitle><CardDescription>Identify the batch before recording its residue-test result.</CardDescription></CardHeader><CardContent className="space-y-6"><BatchLookup mode={labMode} onModeChange={setLabMode} code={labCode} onCodeChange={(value) => { setLabCode(value); setLabBatch(null); }} onLookup={() => void lookupBatch(labCode, 'lab')} loading={loading === 'labLookup'} batch={labBatch} />{labBatch && <form onSubmit={attachLabTest} className="grid gap-4 border-t border-green-100 pt-6 md:grid-cols-2"><Field label="Lab name" id="lab-name" value={labName} onChange={setLabName} /><Field label="Lab certificate URL or ID" id="lab-report" value={reportUrl} onChange={setReportUrl} required={false} /><Field label="Residue level (ppm)" id="residue" value={residueLevel} onChange={setResidueLevel} type="number" /><Field label="Permissible limit (ppm)" id="limit" value={maxLimit} onChange={setMaxLimit} type="number" /><div className="md:col-span-2"><Label>Test result</Label><div className="mt-2 grid grid-cols-2 gap-3"><Button type="button" variant={passed ? 'default' : 'outline'} className={passed ? 'portal-action py-5' : 'border-green-200 text-green-700 hover:bg-green-50'} onClick={() => setPassed(true)}><CheckCircle2 className="mr-2" />Pass</Button><Button type="button" variant={!passed ? 'destructive' : 'outline'} className={!passed ? 'py-5' : 'border-red-200 text-red-700 hover:bg-red-50'} onClick={() => setPassed(false)}><AlertTriangle className="mr-2" />Fail</Button></div></div><Button type="submit" disabled={loading === 'labSubmit'} className="portal-action w-full py-5 text-base md:col-span-2">{loading === 'labSubmit' ? 'Attaching lab test…' : 'Attach lab test'}</Button></form>}</CardContent></Card>}
  </PortalShell>;
}

function SellWorkflow({ mode, onModeChange, code, onCodeChange, onLookup, loading, batch, distributors, previousDistributors, choice, onChoiceChange, newDistributor, onNewDistributorChange, notes, onNotesChange, onSubmit, submitting }: { mode: LookupMode; onModeChange: (mode: LookupMode) => void; code: string; onCodeChange: (value: string) => void; onLookup: () => void; loading: boolean; batch: Batch | null; distributors: Distributor[]; previousDistributors: string[]; choice: string; onChoiceChange: (value: string) => void; newDistributor: string; onNewDistributorChange: (value: string) => void; notes: string; onNotesChange: (value: string) => void; onSubmit: (event: React.FormEvent) => void; submitting: boolean }) {
  const previousOnly = previousDistributors.filter((name) => !distributors.some((distributor) => distributor.full_name === name));
  return <Card className="portal-surface"><CardHeader><CardTitle>Sell batch to a distributor</CardTitle><CardDescription>Only received batches with a passing lab test can leave the hub.</CardDescription></CardHeader><CardContent className="space-y-6"><BatchLookup mode={mode} onModeChange={onModeChange} code={code} onCodeChange={onCodeChange} onLookup={onLookup} loading={loading} batch={batch} />{batch && <form onSubmit={onSubmit} className="space-y-4 border-t border-green-100 pt-6"><div><Label htmlFor="distributor-choice">Distributor</Label><select id="distributor-choice" value={choice} onChange={(event) => onChoiceChange(event.target.value)} className="portal-field mt-2 h-10 w-full rounded-md px-3"><option value="new">+ Add new distributor</option>{distributors.length > 0 && <optgroup label="Registered distributors">{distributors.map((distributor) => <option key={distributor.id} value={distributor.full_name}>{distributor.full_name}{distributor.location ? ` · ${distributor.location}` : ''}</option>)}</optgroup>}{previousOnly.length > 0 && <optgroup label="Previous distributors">{previousOnly.map((name) => <option key={name} value={name}>{name}</option>)}</optgroup>}</select></div>{choice === 'new' && <div><Label htmlFor="new-distributor">New distributor name</Label><Input id="new-distributor" className="portal-field mt-2" placeholder="Example: North Star Distribution" value={newDistributor} onChange={(event) => onNewDistributorChange(event.target.value)} required /></div>}<div><Label htmlFor="sale-notes">Sale and transport notes</Label><Input id="sale-notes" className="portal-field mt-2" placeholder="Example: 250 kg, refrigerated pickup" value={notes} onChange={(event) => onNotesChange(event.target.value)} /></div><Button type="submit" disabled={submitting} className="portal-action w-full py-5 text-base">{submitting ? 'Recording sale…' : <><Send className="mr-2" />Confirm sale to distributor</>}</Button></form>}</CardContent></Card>;
}

function WorkflowButton({ active, icon, title, description, onClick }: { active: boolean; icon: React.ReactNode; title: string; description: string; onClick: () => void }) { return <button type="button" onClick={onClick} className={`rounded-xl border p-5 text-left transition-colors ${active ? 'border-green-600 bg-green-50 ring-2 ring-green-100' : 'border-green-100 bg-white hover:bg-green-50'}`}><span className="mb-3 inline-flex rounded-lg bg-green-100 p-2 text-green-700">{icon}</span><span className="block font-semibold text-slate-900">{title}</span><span className="mt-1 block text-sm text-slate-600">{description}</span></button>; }
function BatchLookup({ mode, onModeChange, code, onCodeChange, onLookup, loading, batch }: { mode: LookupMode; onModeChange: (mode: LookupMode) => void; code: string; onCodeChange: (value: string) => void; onLookup: () => void; loading: boolean; batch: Batch | null }) { return <div className="space-y-5"><div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1"><Button type="button" variant={mode === 'scan' ? 'default' : 'ghost'} className={mode === 'scan' ? 'portal-action' : 'text-slate-600'} onClick={() => onModeChange('scan')}><ScanLine className="mr-2" />Scan QR code</Button><Button type="button" variant={mode === 'manual' ? 'default' : 'ghost'} className={mode === 'manual' ? 'portal-action' : 'text-slate-600'} onClick={() => onModeChange('manual')}><Search className="mr-2" />Enter manually</Button></div>{mode === 'scan' && <div className="rounded-lg border border-green-100 bg-green-50 p-4 text-sm text-slate-700"><p className="font-semibold text-green-800">QR scan ready</p><p className="mt-1">Camera scanning is not configured in this app. Scan the label with your device, then enter the displayed batch ID below.</p></div>}<div className="flex flex-col gap-3 sm:flex-row"><div className="flex-1"><Label htmlFor={`batch-${mode}`}>{mode === 'scan' ? 'Scanned batch ID' : 'Batch ID'}</Label><Input id={`batch-${mode}`} className="portal-field mt-2" placeholder="Example: SK-2026-X981" value={code} onChange={(event) => onCodeChange(event.target.value)} /></div><Button type="button" onClick={onLookup} disabled={loading} className="portal-action mt-auto py-5">{loading ? 'Finding…' : 'Find batch'}</Button></div>{batch && <BatchSummary batch={batch} />}</div>; }
function BatchSummary({ batch }: { batch: Batch }) { return <div className="rounded-xl border border-green-200 bg-green-50 p-4"><p className="text-sm font-semibold text-green-800">Batch found · review before continuing</p><div className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><Detail label="Batch ID" value={batch.batch_code} /><Detail label="Crop" value={batch.crop_name} /><Detail label="Farm" value={batch.farm_location} /><Detail label="Harvest date" value={new Date(batch.harvest_date).toLocaleDateString()} /><Detail label="Weight" value={`${batch.total_weight_kg} kg`} /><Detail label="Current status" value={batch.status.replaceAll('_', ' ')} /></div>{batch.is_recalled && <p className="mt-3 rounded-lg bg-red-100 p-2 text-sm font-medium text-red-800">This batch is recalled. Do not process it.</p>}</div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-slate-500">{label}</p><p className="font-medium capitalize text-slate-900">{value}</p></div>; }
function Field({ label, id, value, onChange, type = 'text', required = true }: { label: string; id: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <div><Label htmlFor={id}>{label}</Label><Input id={id} type={type} step={type === 'number' ? '0.01' : undefined} className="portal-field mt-2" value={value} onChange={(event) => onChange(event.target.value)} required={required} /></div>; }
