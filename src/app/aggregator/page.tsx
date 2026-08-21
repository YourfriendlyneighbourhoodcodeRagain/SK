'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ClipboardCheck, QrCode, FlaskConical, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { generateHash, getAuthenticatedActor, getPreviousHash } from '@/lib/blockchain';

export default function AggregatorDashboard() {
  const [batchId, setBatchId] = useState('');
  const [notes, setNotes] = useState('');
  const [labName, setLabName] = useState('');
  const [residueLevel, setResidueLevel] = useState('');
  const [maxLimit, setMaxLimit] = useState('');
  const [reportUrl, setReportUrl] = useState('');
  const [passed, setPassed] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg('');
    try {
      const user = await getAuthenticatedActor();
      // Find batch
      const { data: batch, error: batchError } = await supabase
        .from('batches')
        .select('id')
        .eq('batch_code', batchId)
        .single();
        
      if (batchError || !batch) throw new Error('Batch not found. Check the Batch ID and try again.');

      // Update batch status
      await supabase
        .from('batches')
        .update({ status: 'aggregated' })
        .eq('id', batch.id);

      // Add handoff
      const prevHash = await getPreviousHash(batch.id);
      const { error: handoffError } = await supabase.from('handoffs').insert([
        {
          batch_id: batch.id,
          actor_id: user.id,
          stage: 'aggregation',
          location: 'Aggregator Hub',
          notes: notes,
          prev_hash: prevHash,
          current_hash: generateHash({ stage: 'aggregation', notes }, prevHash)
        }
      ]);
      if (handoffError) throw handoffError;

      setStatusMsg('Success: Batch received and logged!');
      setBatchId('');
      setNotes('');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Error processing request.');
    }
  };

  const handleLabTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg('');
    try {
      const user = await getAuthenticatedActor();
      const { data: batch, error: batchError } = await supabase
        .from('batches')
        .select('id')
        .eq('batch_code', batchId)
        .single();
        
      if (batchError || !batch) throw new Error('Batch not found. Check the Batch ID and try again.');

      await supabase.from('lab_tests').insert([
        {
          batch_id: batch.id,
          tester_id: user.id,
          lab_name: labName,
          residue_level_ppm: parseFloat(residueLevel),
          max_permissible_limit_ppm: parseFloat(maxLimit),
          passed: passed
          ,report_url: reportUrl || null
        }
      ]);

      setStatusMsg('Success: Lab test results attached!');
      setLabName('');
      setResidueLevel('');
      setMaxLimit('');
      setReportUrl('');
      setPassed(true);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Error processing lab test.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <header className="mb-6 flex items-center bg-blue-700 text-white p-4 rounded-lg shadow">
        <ClipboardCheck className="h-8 w-8 mr-3" />
        <h1 className="text-2xl font-bold">Aggregator / Quality Hub</h1>
      </header>

      <main className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {statusMsg && (
          <div className={`col-span-1 md:col-span-2 p-4 rounded-lg font-bold text-center ${statusMsg.startsWith('Success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {statusMsg}
          </div>
        )}

        <Card className="border-t-4 border-t-blue-500 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <QrCode className="mr-2 h-5 w-5 text-blue-600" />
              Receive Batch
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                <Label htmlFor="notes" className="text-base">Quality/Quantity Notes</Label>
                <Input 
                  id="notes"
                  placeholder="e.g. Sorted 480kg good quality" 
                  className="text-lg py-6"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full py-6 text-lg bg-blue-600 hover:bg-blue-700">
                Log Receipt
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-purple-500 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <FlaskConical className="mr-2 h-5 w-5 text-purple-600" />
              Attach Lab Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLabTest} className="space-y-4">
              <div>
                <Label htmlFor="batchIdTest" className="text-base">Batch ID</Label>
                <Input 
                  id="batchIdTest"
                  placeholder="e.g. SK-2026-X981" 
                  className="text-lg py-6"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="labName" className="text-base">Lab Name</Label>
                <Input 
                  id="labName"
                  placeholder="e.g. AgriSafe Labs" 
                  className="text-lg py-6"
                  value={labName}
                  onChange={(e) => setLabName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="residue" className="text-base">Residue (ppm)</Label>
                  <Input 
                    id="residue"
                    type="number"
                    step="0.01"
                    placeholder="0.01" 
                    className="text-lg py-6"
                    value={residueLevel}
                    onChange={(e) => setResidueLevel(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="limit" className="text-base">Max Limit (ppm)</Label>
                  <Input 
                    id="limit"
                    type="number"
                    step="0.01"
                    placeholder="0.05" 
                    className="text-lg py-6"
                    value={maxLimit}
                    onChange={(e) => setMaxLimit(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="reportUrl" className="text-base">Lab Certificate URL / ID</Label>
                <Input id="reportUrl" placeholder="https://lab.example/report or certificate ID" className="text-lg py-6" value={reportUrl} onChange={(e) => setReportUrl(e.target.value)} />
              </div>
              
              <div className="flex gap-4 pt-2">
                <Button 
                  type="button" 
                  variant={passed ? 'default' : 'outline'}
                  className={`flex-1 py-6 text-lg ${passed ? 'bg-green-600 hover:bg-green-700' : 'border-green-200 text-green-700'}`}
                  onClick={() => setPassed(true)}
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" /> PASS
                </Button>
                <Button 
                  type="button" 
                  variant={!passed ? 'destructive' : 'outline'}
                  className={`flex-1 py-6 text-lg ${!passed ? '' : 'border-red-200 text-red-700'}`}
                  onClick={() => setPassed(false)}
                >
                  <AlertTriangle className="mr-2 h-5 w-5" /> FAIL
                </Button>
              </div>

              <Button type="submit" className="w-full py-6 text-lg bg-purple-600 hover:bg-purple-700 mt-2">
                Submit Test Results
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
