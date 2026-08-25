'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ClipboardCheck, QrCode, FlaskConical, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getAuthenticatedActor } from '@/lib/blockchain';
import { PortalShell } from '@/components/portal-shell';

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
        .update({ status: 'received_by_aggregator' })
        .eq('id', batch.id);

      // Add handoff
      const { error: handoffError } = await supabase.from('batch_handoffs').insert([
        {
          batch_id: batch.id,
          handler_id: user.id,
          stage: 'aggregation',
          notes
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
          residue_ppm: parseFloat(residueLevel),
          max_limit_ppm: parseFloat(maxLimit),
          test_status: passed ? 'PASS' : 'FAIL',
          certificate_url: reportUrl || null
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
    <PortalShell title="Aggregator quality hub" description="Receive batches and attach lab safety evidence." icon={ClipboardCheck}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {statusMsg && (
          <div className={`col-span-1 p-4 text-center font-medium md:col-span-2 ${statusMsg.startsWith('Success') ? 'portal-status-success' : 'portal-status-error'}`}>
            {statusMsg}
          </div>
        )}

        <Card className="portal-surface">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <QrCode className="mr-2 h-5 w-5 text-green-700" />
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
                  className="portal-field py-5"
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
                  className="portal-field py-5"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="portal-action w-full py-5 text-base">
                Log Receipt
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="portal-surface">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <FlaskConical className="mr-2 h-5 w-5 text-green-700" />
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
                  className="portal-field py-5"
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
                  className="portal-field py-5"
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
                    className="portal-field py-5"
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
                    className="portal-field py-5"
                    value={maxLimit}
                    onChange={(e) => setMaxLimit(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="reportUrl" className="text-base">Lab Certificate URL / ID</Label>
                <Input id="reportUrl" placeholder="https://lab.example/report or certificate ID" className="portal-field py-5" value={reportUrl} onChange={(e) => setReportUrl(e.target.value)} />
              </div>
              
              <div className="flex gap-4 pt-2">
                <Button 
                  type="button" 
                  variant={passed ? 'default' : 'outline'}
                  className={`flex-1 py-5 text-base ${passed ? 'portal-action' : 'border-green-200 text-green-700 hover:bg-green-50'}`}
                  onClick={() => setPassed(true)}
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" /> PASS
                </Button>
                <Button 
                  type="button" 
                  variant={!passed ? 'destructive' : 'outline'}
                  className={`flex-1 py-5 text-base ${!passed ? '' : 'border-red-200 text-red-700 hover:bg-red-50'}`}
                  onClick={() => setPassed(false)}
                >
                  <AlertTriangle className="mr-2 h-5 w-5" /> FAIL
                </Button>
              </div>

              <Button type="submit" className="portal-action mt-2 w-full py-5 text-base">
                Submit Test Results
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
