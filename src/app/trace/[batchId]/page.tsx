import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Scale, Sprout, Truck, Store, FlaskConical, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

type Handoff = { stage: string; location: string | null; created_at: string; notes: string | null; current_hash?: string | null };
type LabTest = { passed: boolean; residue_level_ppm: number; max_permissible_limit_ppm: number; lab_name: string };
type TraceBatch = {
  batch_code: string; crop_type: string; quantity_kg: number; harvest_date: string; farm_location: string;
  status: string; is_recalled: boolean; profiles?: { full_name: string; location: string | null } | null;
  handoffs?: Handoff[]; lab_tests?: LabTest[];
};

export default async function TracePage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  // Try to fetch from Supabase
  const { data: batch } = await supabase
    .from('batches')
    .select(`
      *,
      profiles:farmer_id (full_name, location),
      handoffs (*),
      lab_tests (*)
    `)
    .eq('batch_code', batchId)
    .single();

  // For MVP demonstration, if not found or error, we can optionally show a mock or just not found.
  // We'll just show not found if it truly doesn't exist.
  // However, to make the MVP testable without a seeded DB, let's provide a fallback mock if the batch ID is 'SK-2026-X981'
  let displayBatch = batch as TraceBatch | null;
  
  if (!displayBatch && batchId === 'SK-2026-X981') {
    displayBatch = {
      batch_code: 'SK-2026-X981',
      crop_type: 'Organic Tomatoes',
      quantity_kg: 500,
      harvest_date: '2026-08-18',
      farm_location: 'Green Valley Farms, Maharashtra',
      status: 'on_shelf',
      is_recalled: false,
      profiles: { full_name: 'Ramesh Kumar', location: 'Maharashtra' },
      handoffs: [
        { stage: 'harvest', location: 'Green Valley Farms', created_at: '2026-08-18T08:00:00Z', notes: 'Harvested early morning' },
        { stage: 'aggregation', location: 'Central Hub Pune', created_at: '2026-08-19T10:00:00Z', notes: 'Sorted and graded' },
        { stage: 'logistics', location: 'Highway 48', created_at: '2026-08-19T14:00:00Z', notes: 'Temp maintained at 4°C' },
        { stage: 'retail', location: 'FreshMart Mumbai', created_at: '2026-08-20T09:00:00Z', notes: 'Placed on shelf' }
      ],
      lab_tests: [
        { passed: true, residue_level_ppm: 0.01, max_permissible_limit_ppm: 0.05, lab_name: 'AgriSafe Labs' }
      ]
    };
  }

  if (!displayBatch) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
        <h1 className="text-3xl font-bold mb-2">Batch Not Found</h1>
        <p className="text-slate-600 mb-6">We couldn&apos;t find any traceability records for Batch ID: {batchId}</p>
        <Link href="/" className="text-green-600 hover:underline">Return Home</Link>
      </div>
    );
  }

  const isRecalled = displayBatch.is_recalled;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="bg-green-700 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Sprout className="h-6 w-6" />
            <span className="text-xl font-bold">SurakshaKhadya</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl p-4 mt-6 space-y-6">
        {isRecalled && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-lg">Product Recall Alert</h3>
              <p>This batch has been recalled due to safety concerns. Do not consume.</p>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{displayBatch.crop_type}</h1>
            <p className="text-slate-500 font-mono mt-1">Batch ID: {displayBatch.batch_code}</p>
          </div>
          <Badge variant={isRecalled ? 'destructive' : 'default'} className={!isRecalled ? 'bg-green-600' : ''}>
            {isRecalled ? 'RECALLED' : displayBatch.status.toUpperCase().replace('_', ' ')}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <MapPin className="mr-2 h-5 w-5 text-green-600" />
                Origin Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Farmer</span>
                <span className="font-medium">{displayBatch.profiles?.full_name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Farm Location</span>
                <span className="font-medium">{displayBatch.farm_location}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Harvest Date</span>
                <span className="font-medium">{new Date(displayBatch.harvest_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Quantity</span>
                <span className="font-medium">{displayBatch.quantity_kg} kg</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <FlaskConical className="mr-2 h-5 w-5 text-blue-600" />
                Safety & Lab Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {displayBatch.lab_tests && displayBatch.lab_tests.length > 0 ? (
                displayBatch.lab_tests.map((test: LabTest, idx: number) => (
                  <div key={idx} className="space-y-3">
                    <div className="flex items-center space-x-2 mb-2">
                      {test.passed ? (
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-6 w-6 text-red-500" />
                      )}
                      <span className={`font-bold ${test.passed ? 'text-green-700' : 'text-red-700'}`}>
                        {test.passed ? 'PASSED: Safe for Consumption' : 'FAILED: Unsafe'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b pb-2 text-sm">
                      <span className="text-slate-500">Pesticide Residue</span>
                      <span className="font-medium">{test.residue_level_ppm} ppm</span>
                    </div>
                    <div className="flex justify-between border-b pb-2 text-sm">
                      <span className="text-slate-500">Permissible Limit</span>
                      <span className="font-medium">{test.max_permissible_limit_ppm} ppm</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Testing Lab</span>
                      <span className="font-medium">{test.lab_name}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-4">No lab test records available yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <h2 className="text-2xl font-bold mt-8 mb-4 px-2">Supply Chain Journey</h2>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pb-4">
            {displayBatch.handoffs?.sort((a: Handoff, b: Handoff) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((handoff: Handoff, index: number) => {
              let Icon = Sprout;
              let iconColor = 'text-green-600';
              let bgColor = 'bg-green-100';
              
              if (handoff.stage === 'aggregation') {
                Icon = Scale;
                iconColor = 'text-blue-600';
                bgColor = 'bg-blue-100';
              } else if (handoff.stage === 'logistics') {
                Icon = Truck;
                iconColor = 'text-amber-600';
                bgColor = 'bg-amber-100';
              } else if (handoff.stage === 'retail') {
                Icon = Store;
                iconColor = 'text-purple-600';
                bgColor = 'bg-purple-100';
              }

              return (
                <div key={index} className="relative pl-8">
                  <div className={`absolute -left-[17px] top-1 h-8 w-8 rounded-full ${bgColor} flex items-center justify-center border-2 border-white shadow-sm`}>
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg capitalize">{handoff.stage}</h3>
                    <div className="flex items-center text-slate-500 text-sm mt-1 space-x-4">
                      <span className="flex items-center"><Calendar className="h-3 w-3 mr-1" /> {new Date(handoff.created_at).toLocaleString()}</span>
                      <span className="flex items-center"><MapPin className="h-3 w-3 mr-1" /> {handoff.location}</span>
                    </div>
                    {handoff.notes && <p className="mt-2 text-slate-700 bg-slate-50 p-2 rounded text-sm">{handoff.notes}</p>}
                    {handoff.current_hash && (
                      <p className="mt-2 text-xs text-slate-400 font-mono truncate" title={handoff.current_hash}>
                        Hash: {handoff.current_hash}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
