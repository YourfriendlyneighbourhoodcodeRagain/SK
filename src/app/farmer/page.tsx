'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, QrCode, Sprout } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { CreateBatchForm } from '@/components/CreateBatchForm';
import { PortalShell } from '@/components/portal-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Batch = {
  id: string;
  batch_code: string;
  crop_name: string;
  harvest_date: string;
  farm_location: string;
  total_weight_kg: number;
  status: string;
  is_recalled: boolean;
  pesticide_status: string;
};

export default function FarmerPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadBatches(); }, 0);
    return () => window.clearTimeout(timer);

    async function loadBatches() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Please sign in to view your batches.');
          setLoading(false);
          return;
        }

        const { data, error: queryError } = await supabase
          .from('batches')
          .select('*')
          .eq('farmer_id', user.id)
          .order('created_at', { ascending: false });

        if (queryError) throw queryError;
        setBatches((data || []) as Batch[]);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load batches');
      } finally {
        setLoading(false);
      }
    }
  }, []);

  const statusColor: Record<string, string> = {
    'harvested': 'bg-blue-100 text-blue-800',
    'received_by_aggregator': 'bg-yellow-100 text-yellow-800',
    'in_transit': 'bg-purple-100 text-purple-800',
    'at_retailer': 'bg-green-100 text-green-800',
    'SAFE': 'bg-green-100 text-green-800',
    'CONTAMINATED': 'bg-red-100 text-red-800',
    'CONTAMINATED_RECALLED': 'bg-red-600 text-white',
  };

  const pesticideColor: Record<string, string> = {
    'PASS': 'bg-green-100 text-green-800',
    'FAIL': 'bg-red-100 text-red-800',
    'PENDING': 'bg-gray-100 text-gray-800',
  };

  return (
    <>
      <PortalShell 
        title="Farmer dashboard" 
        description="Register your harvest and receive a permanent public QR trace link." 
        icon={Sprout} 
        contentClassName="max-w-2xl"
        showWorkspaceLink={false}
        onHistoryClick={() => setShowHistory(true)}
      >
        {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
        <CreateBatchForm />
      </PortalShell>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Your Harvest Batches History</DialogTitle>
            <DialogDescription>
              {loading ? 'Loading...' : `${batches.length} batch${batches.length !== 1 ? 'es' : ''} total`}
            </DialogDescription>
          </DialogHeader>
          
          {loading ? (
            <p className="text-slate-600">Loading your batches...</p>
          ) : batches.length === 0 ? (
            <p className="text-slate-600">No batches yet. Register your first harvest using the form.</p>
          ) : (
            <div className="space-y-3">
              {batches.map((batch) => (
                <Link key={batch.id} href={`/trace/${batch.batch_code}`}>
                  <div className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <p className="font-mono text-sm text-slate-500">{batch.batch_code}</p>
                        <p className="text-lg font-semibold text-slate-900">{batch.crop_name}</p>
                      </div>
                      <QrCode className="h-5 w-5 text-green-700" />
                    </div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      <Badge className={statusColor[batch.status] || 'bg-gray-100 text-gray-800'}>
                        {batch.status}
                      </Badge>
                      <Badge className={pesticideColor[batch.pesticide_status] || 'bg-gray-100 text-gray-800'}>
                        {batch.pesticide_status === 'PENDING' ? '🔄 Awaiting lab test' : batch.pesticide_status}
                      </Badge>
                      {batch.is_recalled && (
                        <Badge className="bg-red-600 text-white flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Recalled
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">
                      {batch.total_weight_kg} kg · Harvested {new Date(batch.harvest_date).toLocaleDateString()} · {batch.farm_location}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
