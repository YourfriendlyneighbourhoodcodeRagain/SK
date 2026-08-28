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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Batch = { id: string; batch_code: string; crop_name: string; total_weight_kg: number; farm_location: string; batch_handoffs: { assigned_distributor_name: string | null; stage: string }[] };
type Retailer = { id: string; full_name: string; location: string | null };

export default function DistributorPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [selected, setSelected] = useState<Batch | null>(null);
  const [retailerId, setRetailerId] = useState('');
  const [message, setMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [lookupCode, setLookupCode] = useState('');
  const [lookupError, setLookupError] = useState('');

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage('Sign in with a distributor account to view assigned batches.'); return; }
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    if (!profile) { setMessage('Your distributor profile could not be loaded.'); return; }
    
    // Query for batches assigned to this distributor through handoffs (stage can be 'logistics' or 'distribution')
    const [{ data, error }, { data: retailerRows }] = await Promise.all([
      supabase.from('batches')
        .select('id, batch_code, crop_name, total_weight_kg, farm_location, batch_handoffs!inner(assigned_distributor_name, stage), lab_tests!inner(test_status)')
        .eq('is_recalled', false)
        .eq('lab_tests.test_status', 'PASS')
        .in('batch_handoffs.stage', ['logistics', 'distribution'])
        .eq('batch_handoffs.assigned_distributor_name', profile.full_name)
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, location').eq('role', 'retailer').order('full_name'),
    ]);
    if (error) setMessage(error.message); else setBatches((data ?? []) as Batch[]);
    setRetailers((retailerRows ?? []) as Retailer[]);
  }

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);

  async function lookupBatch() {
    setLookupError('');
    const code = lookupCode.trim();
    if (!code) { setLookupError('Enter a batch code'); return; }
    const batch = batches.find(b => b.batch_code.toUpperCase() === code.toUpperCase());
    if (!batch) { setLookupError('Batch not found in your assigned list'); return; }
    setSelected(batch);
    setMessage('');
  }

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
      setSelected(null); setRetailerId(''); setLookupCode(''); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not send this batch.'); }
  }

  return <>
    <PortalShell title="Distributor logistics" description="Search for a batch and send it to a retailer." icon={Truck} showWorkspaceLink={false} onHistoryClick={() => setShowHistory(true)}>
      {message && <p className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">{message}</p>}
      <Card className="portal-surface">
        <CardHeader>
          <CardTitle>Find and send batch</CardTitle>
          <CardDescription>Enter the batch code to locate it and select a retailer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="batch-code">Batch code</Label>
            <div className="flex gap-2">
              <Input
                id="batch-code"
                className="portal-field flex-1"
                placeholder="Example: SK-2026-X981"
                value={lookupCode}
                onChange={(e) => { setLookupCode(e.target.value); setLookupError(''); }}
              />
              <Button onClick={lookupBatch} className="portal-action">Find</Button>
            </div>
            {lookupError && <p className="text-red-600 text-sm">{lookupError}</p>}
          </div>

          {selected && (
            <form onSubmit={send} className="space-y-4 border-t border-green-100 pt-6">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <p className="text-sm font-semibold text-green-800">Selected batch</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{selected.batch_code} · {selected.crop_name}</p>
                <p className="text-sm text-slate-600 mt-1">{selected.total_weight_kg} kg from {selected.farm_location}</p>
              </div>
              <div>
                <Label htmlFor="retailer">Target retailer *</Label>
                <select
                  id="retailer"
                  value={retailerId}
                  onChange={(event) => setRetailerId(event.target.value)}
                  className="portal-field h-10 w-full rounded-md px-3 mt-2"
                  required
                >
                  <option value="">Select a retailer</option>
                  {retailers.map((retailer) => (
                    <option key={retailer.id} value={retailer.id}>
                      {retailer.full_name}{retailer.location ? ` · ${retailer.location}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="portal-action w-full py-4 text-lg font-bold">Confirm dispatch</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </PortalShell>

    <Dialog open={showHistory} onOpenChange={setShowHistory}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Available Batches</DialogTitle>
          <DialogDescription>{batches.length} batch{batches.length !== 1 ? 'es' : ''} ready for distribution</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          {batches.map((batch) => (
            <Card key={batch.id} className="cursor-pointer hover:bg-slate-50" onClick={() => { setSelected(batch); setShowHistory(false); setLookupCode(batch.batch_code); }}>
              <CardHeader>
                <CardTitle className="text-lg">{batch.crop_name}</CardTitle>
                <CardDescription className="font-mono">{batch.batch_code}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">{batch.total_weight_kg} kg · {batch.farm_location}</p>
              </CardContent>
            </Card>
          ))}
          {!batches.length && <p className="text-slate-600">No batches available</p>}
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
