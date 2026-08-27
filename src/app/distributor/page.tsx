'use client';

import { useEffect, useState } from 'react';
import { Send, Truck } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { recordHandoff } from '@/lib/blockchain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PortalShell } from '@/components/portal-shell';

type Batch = { id: string; batch_code: string; crop_name: string; total_weight_kg: number; farm_location: string; batch_handoffs: { assigned_distributor_name: string | null; stage: string }[] };
type Retailer = { id: string; full_name: string; location: string | null };

export default function DistributorPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [selected, setSelected] = useState<Batch | null>(null);
  const [retailerId, setRetailerId] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage('Sign in with a distributor account to view assigned batches.'); return; }
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    if (!profile) { setMessage('Your distributor profile could not be loaded.'); return; }
    const [{ data, error }, { data: retailerRows }] = await Promise.all([
      supabase.from('batches')
        .select('id, batch_code, crop_name, total_weight_kg, farm_location, batch_handoffs!inner(assigned_distributor_name, stage), lab_tests!inner(test_status)')
        .eq('status', 'in_transit').eq('is_recalled', false).eq('lab_tests.test_status', 'PASS')
        .eq('batch_handoffs.stage', 'logistics').eq('batch_handoffs.assigned_distributor_name', profile.full_name)
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, location').eq('role', 'retailer').order('full_name'),
    ]);
    if (error) setMessage(error.message); else setBatches((data ?? []) as Batch[]);
    setRetailers((retailerRows ?? []) as Retailer[]);
  }

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const recipient = retailers.find((retailer) => retailer.id === retailerId);
    if (!recipient) { setMessage('Select a retailer from the directory.'); return; }
    setMessage('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in again.');
      const { error: deliveryError } = await supabase.from('retailer_deliveries').insert({
        batch_id: selected.id,
        distributor_id: user.id,
        retailer_id: recipient.id,
        quantity_kg: selected.total_weight_kg,
        status: 'WAITING',
      });
      if (deliveryError) throw deliveryError;

      // Once the distributor dispatches the batch, it should no longer appear
      // in the distributor's available-to-send queue. The retailer delivery
      // remains independently trackable in retailer_deliveries until receipt.
      const { error: statusError } = await supabase
        .from('batches')
        .update({ status: 'at_retailer' })
        .eq('id', selected.id)
        .eq('is_recalled', false);
      if (statusError) throw statusError;

      await recordHandoff({
        batchId: selected.id,
        stage: 'logistics',
        assignedRetailerName: recipient.full_name,
        notes: `Sent to ${recipient.full_name}`,
        location: recipient.location ?? undefined,
      });
      setMessage(`${selected.batch_code} is now assigned to ${recipient.full_name}.`);
      setSelected(null); setRetailerId(''); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not send this batch.'); }
  }

  return <PortalShell title="Distributor logistics" description="Only quality-passed batches are ready to be sent to a retailer." icon={Truck}>
    {message && <p className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">{message}</p>}
    <div className="grid gap-4 md:grid-cols-2">
      {batches.map((batch) => <Card key={batch.id} className="portal-surface"><CardHeader><CardTitle>{batch.crop_name}</CardTitle><CardDescription className="font-mono">{batch.batch_code}</CardDescription></CardHeader><CardContent><p className="mb-4 text-sm text-slate-600">{batch.total_weight_kg} kg · {batch.farm_location}</p><Button className="portal-action w-full py-4 text-lg font-bold" onClick={() => { setSelected(batch); setMessage(''); }}><Send className="mr-2" />Send to Retailer</Button></CardContent></Card>)}
    </div>
    {!batches.length && <Card className="portal-surface"><CardContent className="p-6 text-slate-600">No quality-passed batches are waiting for distribution.</CardContent></Card>}
    <form onSubmit={send} className={`mt-6 ${selected ? 'block' : 'hidden'}`}>
      <Card className="portal-surface"><CardHeader><CardTitle>Send {selected?.batch_code}</CardTitle></CardHeader><CardContent className="space-y-4">
        <div><Label htmlFor="retailer">Target retailer</Label><select id="retailer" value={retailerId} onChange={(event) => setRetailerId(event.target.value)} className="portal-field h-10 w-full rounded-md px-3" required><option value="">Select a retailer</option>{retailers.map((retailer) => <option key={retailer.id} value={retailer.id}>{retailer.full_name}{retailer.location ? ` · ${retailer.location}` : ''}</option>)}</select></div>
        <Button type="submit" className="portal-action py-4 text-lg font-bold">Confirm dispatch</Button>
      </CardContent></Card>
    </form>
  </PortalShell>;
}
