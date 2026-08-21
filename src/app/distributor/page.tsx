'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Truck, MapPin, Thermometer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { generateHash, getAuthenticatedActor, getPreviousHash } from '@/lib/blockchain';

export default function DistributorDashboard() {
  const [batchId, setBatchId] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [temperature, setTemperature] = useState('');
  const [notes, setNotes] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const handleLogistics = async (e: React.FormEvent) => {
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

      await supabase
        .from('batches')
        .update({ status: 'in_transit' })
        .eq('id', batch.id);

      const prevHash = await getPreviousHash(batch.id);
      const { error: handoffError } = await supabase.from('handoffs').insert([
        {
          batch_id: batch.id,
          actor_id: user.id,
          stage: 'logistics',
          location: `From ${origin} to ${destination}`,
          notes: `Temp: ${temperature}°C. ${notes}`,
          prev_hash: prevHash,
          current_hash: generateHash({ stage: 'logistics', origin, destination, temperature, notes }, prevHash)
        }
      ]);
      if (handoffError) throw handoffError;

      setStatusMsg('Success: Logistics handoff logged successfully!');
      setBatchId('');
      setOrigin('');
      setDestination('');
      setTemperature('');
      setNotes('');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Error processing logistics handoff.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <header className="mb-6 flex items-center bg-amber-600 text-white p-4 rounded-lg shadow">
        <Truck className="h-8 w-8 mr-3" />
        <h1 className="text-2xl font-bold">Distributor / Logistics Hub</h1>
      </header>

      <main className="max-w-2xl mx-auto">
        {statusMsg && (
          <div className={`mb-6 p-4 rounded-lg font-bold text-center ${statusMsg.startsWith('Success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {statusMsg}
          </div>
        )}

        <Card className="border-t-4 border-t-amber-500 shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center">
              <Truck className="mr-2 h-6 w-6 text-amber-600" />
              Log Transport / Handoff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogistics} className="space-y-6">
              <div>
                <Label htmlFor="batchId" className="text-lg">Batch ID</Label>
                <Input 
                  id="batchId"
                  placeholder="e.g. SK-2026-X981" 
                  className="text-lg py-6 mt-1"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="origin" className="text-lg flex items-center"><MapPin className="h-4 w-4 mr-1"/> Origin</Label>
                  <Input 
                    id="origin"
                    placeholder="e.g. Pune Hub" 
                    className="text-lg py-6 mt-1"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="destination" className="text-lg flex items-center"><MapPin className="h-4 w-4 mr-1"/> Destination</Label>
                  <Input 
                    id="destination"
                    placeholder="e.g. Mumbai Store" 
                    className="text-lg py-6 mt-1"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="temperature" className="text-lg flex items-center"><Thermometer className="h-4 w-4 mr-1"/> Storage Temp (°C)</Label>
                <Input 
                  id="temperature"
                  type="number"
                  placeholder="e.g. 4" 
                  className="text-lg py-6 mt-1"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes" className="text-lg">Additional Notes</Label>
                <Input 
                  id="notes"
                  placeholder="e.g. Refrigerated truck, no delays" 
                  className="text-lg py-6 mt-1"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full py-6 text-xl bg-amber-600 hover:bg-amber-700 mt-4">
                Confirm Handoff
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
