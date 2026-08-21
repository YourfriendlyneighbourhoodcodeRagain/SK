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
    <div className="min-h-screen bg-slate-50 p-4">
      <header className="mb-6 flex items-center bg-purple-700 text-white p-4 rounded-lg shadow">
        <Store className="h-8 w-8 mr-3" />
        <h1 className="text-2xl font-bold">Retailer Dashboard</h1>
      </header>

      <main className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Receive at Store */}
        <Card className="border-t-4 border-t-purple-500 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Store className="mr-2 h-5 w-5 text-purple-600" />
              Receive at Store (On Shelf)
            </CardTitle>
            <CardDescription>Log receipt and generate consumer QR code</CardDescription>
          </CardHeader>
          <CardContent>
            {statusMsg && (
              <div className={`mb-4 p-3 rounded font-bold text-sm ${statusMsg.startsWith('Success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
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
                    className="text-lg py-6"
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
                    className="text-lg py-6"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full py-6 text-lg bg-purple-600 hover:bg-purple-700">
                  Mark &quot;On Shelf&quot;
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="bg-slate-100 p-4 rounded-lg inline-block border-2 border-slate-200">
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
        <Card className="border-t-4 border-t-red-600 shadow-md bg-red-50">
          <CardHeader>
            <CardTitle className="text-xl flex items-center text-red-700">
              <ShieldAlert className="mr-2 h-5 w-5" />
              Flag Contamination / Recall
            </CardTitle>
            <CardDescription className="text-red-600">Instantly flag unsafe batches</CardDescription>
          </CardHeader>
          <CardContent>
            {recallMsg && (
              <div className={`mb-4 p-3 rounded font-bold text-sm ${recallMsg.startsWith('URGENT') ? 'bg-red-200 text-red-900 border border-red-300' : 'bg-red-100 text-red-800'}`}>
                {recallMsg}
              </div>
            )}
            
            <form onSubmit={handleRecall} className="space-y-4">
              <div>
                <Label htmlFor="recallBatchId" className="text-base text-red-900">Batch ID to Recall</Label>
                <Input 
                  id="recallBatchId"
                  placeholder="e.g. SK-2026-X981" 
                  className="text-lg py-6 border-red-300 focus-visible:ring-red-500"
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
                  className="text-lg py-6 border-red-300 focus-visible:ring-red-500"
                  value={recallReason}
                  onChange={(e) => setRecallReason(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" variant="destructive" className="w-full py-6 text-lg bg-red-600 hover:bg-red-700 font-bold">
                <AlertTriangle className="mr-2 h-5 w-5" />
                INITIATE RECALL
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
