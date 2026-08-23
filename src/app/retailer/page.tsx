'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Store, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { QRCodeSVG } from 'qrcode.react';
import { generateHash, getAuthenticatedActor, getPreviousHash } from '@/lib/blockchain';
import { PortalShell } from '@/components/portal-shell';

export default function RetailerDashboard() {
  const [batchId, setBatchId] = useState('');
  const [storeName, setStoreName] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [shelfQR, setShelfQR] = useState<string | null>(null);

  const [recallBatchId, setRecallBatchId] = useState('');
  const [recallReason, setRecallReason] = useState('');
  const [recallMsg, setRecallMsg] = useState('');

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg('');
    setShelfQR(null);
    try {
      const user = await getAuthenticatedActor();
      const { data: batch, error: batchError } = await supabase
        .from('batches')
        .select('id')
        .eq('batch_code', batchId)
        .single();
        
      if (batchError || !batch) throw new Error('Batch not found. Check the Batch ID and try again.');

      await supabase
        .from('batches')
        .update({ status: 'on_shelf' })
        .eq('id', batch.id);

      const prevHash = await getPreviousHash(batch.id);
      const { error: handoffError } = await supabase.from('handoffs').insert([
        {
          batch_id: batch.id,
          actor_id: user.id,
          stage: 'retail',
          location: storeName,
          notes: 'Received and placed on shelf for consumers',
          prev_hash: prevHash,
          current_hash: generateHash({ stage: 'retail', storeName }, prevHash)
        }
      ]);
      if (handoffError) throw handoffError;

      setStatusMsg('Success: Batch marked as On Shelf!');
      setShelfQR(batchId);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Error processing store receipt.');
    }
  };

  const handleRecall = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecallMsg('');
    try {
      const user = await getAuthenticatedActor();
      const { data: batch, error: batchError } = await supabase
        .from('batches')
        .select('id')
        .eq('batch_code', recallBatchId)
        .single();
        
      if (batchError || !batch) throw new Error('Batch not found. Check the Batch ID and try again.');

      await supabase
        .from('batches')
        .update({ is_recalled: true, status: 'recalled' })
        .eq('id', batch.id);

      const prevHash = await getPreviousHash(batch.id);
      const { error: handoffError } = await supabase.from('handoffs').insert([
        {
          batch_id: batch.id,
          actor_id: user.id,
          stage: 'retail',
          location: 'RECALL INITIATED',
          notes: `RECALL REASON: ${recallReason}`,
          prev_hash: prevHash,
          current_hash: generateHash({ stage: 'retail', action: 'recall', recallReason }, prevHash)
        }
      ]);
      if (handoffError) throw handoffError;

      setRecallMsg('URGENT: Recall initiated successfully! Alerts sent.');
      setRecallBatchId('');
      setRecallReason('');
    } catch (err) {
      setRecallMsg(err instanceof Error ? err.message : 'Error processing recall.');
    }
  };

  return (
    <PortalShell title="Retailer dashboard" description="Put verified batches on shelves and manage safety recalls." icon={Store}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Receive at Store */}
        <Card className="portal-surface">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Store className="mr-2 h-5 w-5 text-green-700" />
              Receive at Store (On Shelf)
            </CardTitle>
            <CardDescription>Log receipt and generate consumer QR code</CardDescription>
          </CardHeader>
          <CardContent>
            {statusMsg && (
              <div className={`mb-4 p-3 text-sm font-medium ${statusMsg.startsWith('Success') ? 'portal-status-success' : 'portal-status-error'}`}>
                {statusMsg}
              </div>
            )}
            
            {!shelfQR ? (
              <form onSubmit={handleReceive} className="space-y-4">
                <div>
                  <Label htmlFor="batchIdReceive" className="text-base">Batch ID</Label>
                  <Input 
                    id="batchIdReceive"
                    placeholder="e.g. SK-2026-X981" 
                    className="portal-field py-5"
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="storeName" className="text-base">Store Name</Label>
                  <Input 
                    id="storeName"
                    placeholder="e.g. FreshMart Mumbai" 
                    className="portal-field py-5"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="portal-action w-full py-5 text-base">
                  Mark &quot;On Shelf&quot;
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="inline-block rounded-lg border border-green-100 bg-white p-4 shadow-sm">
                  <QRCodeSVG 
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/trace/${shelfQR}`}
                    size={200} 
                    level="H"
                  />
                </div>
                <p className="font-mono font-bold text-lg">{shelfQR}</p>
                <Button 
                  onClick={() => { setShelfQR(null); setBatchId(''); setStoreName(''); setStatusMsg(''); }}
                  variant="outline" 
                  className="w-full"
                >
                  Scan Next Batch
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recall Module */}
        <Card className="rounded-xl border border-red-200 bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl flex items-center text-red-700">
              <ShieldAlert className="mr-2 h-5 w-5" />
              Flag Contamination / Recall
            </CardTitle>
            <CardDescription className="text-red-600">Instantly flag unsafe batches</CardDescription>
          </CardHeader>
          <CardContent>
            {recallMsg && (
              <div className="portal-status-error mb-4 p-3 text-sm font-medium">
                {recallMsg}
              </div>
            )}
            
            <form onSubmit={handleRecall} className="space-y-4">
              <div>
                <Label htmlFor="recallBatchId" className="text-base text-red-900">Batch ID to Recall</Label>
                <Input 
                  id="recallBatchId"
                  placeholder="e.g. SK-2026-X981" 
                  className="border-red-200 py-5 focus-visible:ring-red-500"
                  value={recallBatchId}
                  onChange={(e) => setRecallBatchId(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="recallReason" className="text-base text-red-900">Reason for Recall</Label>
                <Input 
                  id="recallReason"
                  placeholder="e.g. High pesticide residue detected" 
                  className="border-red-200 py-5 focus-visible:ring-red-500"
                  value={recallReason}
                  onChange={(e) => setRecallReason(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" variant="destructive" className="w-full py-5 text-base font-semibold">
                <AlertTriangle className="mr-2 h-5 w-5" />
                INITIATE RECALL
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
