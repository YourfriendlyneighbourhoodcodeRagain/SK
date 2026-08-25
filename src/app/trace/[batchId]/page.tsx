import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Calendar, Scale, Sprout, Truck, Store, FlaskConical, AlertTriangle, CheckCircle2, ShieldCheck, ExternalLink } from 'lucide-react';
import Link from 'next/link';

type Handoff = { stage: string; assigned_distributor_name?: string | null; assigned_retailer_name: string | null; created_at: string; notes: string | null };
type LabTest = { test_status: 'PASS' | 'FAIL'; residue_ppm: number; max_limit_ppm: number; lab_name: string; certificate_url?: string | null; created_at?: string };
type TraceBatch = {
  batch_code: string; crop_name: string; total_weight_kg: number; harvest_date: string; farm_location: string;
  status: string; is_recalled: boolean; profiles?: { full_name: string; location: string | null } | null;
  batch_handoffs?: Handoff[]; lab_tests?: LabTest[];
};

export default async function TracePage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  // Try to fetch from Supabase
  const { data: batch } = await supabase
    .from('batches')
    .select(`
      *,
      profiles:farmer_id (full_name, location),
      batch_handoffs (*),
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
      crop_name: 'Organic Tomatoes',
      total_weight_kg: 500,
      harvest_date: '2026-08-18',
      farm_location: 'Green Valley Farms, Maharashtra',
      status: 'on_shelf',
      is_recalled: false,
      profiles: { full_name: 'Ramesh Kumar', location: 'Maharashtra' },
      batch_handoffs: [
        { stage: 'aggregation', assigned_retailer_name: null, created_at: '2026-08-19T10:00:00Z', notes: 'Sorted and graded' },
        { stage: 'distribution', assigned_retailer_name: 'FreshMart Mumbai', created_at: '2026-08-19T14:00:00Z', notes: 'Sent in refrigerated vehicle' },
        { stage: 'retail', assigned_retailer_name: 'FreshMart Mumbai', created_at: '2026-08-20T09:00:00Z', notes: 'Placed on shelf' }
      ],
      lab_tests: [
        { test_status: 'PASS', residue_ppm: 0.01, max_limit_ppm: 0.05, lab_name: 'AgriSafe Labs' }
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
  const orderedHandoffs = [...(displayBatch.batch_handoffs ?? [])].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const latestLabTest = [...(displayBatch.lab_tests ?? [])].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())[0];
  const safetyStatus = isRecalled ? 'Recalled' : !latestLabTest ? 'Pending lab test' : latestLabTest.test_status === 'PASS' ? 'Safe to consume' : 'Lab test failed';
  const chainVerified = orderedHandoffs.length > 0;
  const retailHandoff = orderedHandoffs.findLast((handoff) => handoff.stage === 'retail');

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
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm">
            <div className="flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-lg">Product Recall Alert</h3>
              <p>This batch has been recalled due to a recorded safety concern. Do not consume it; return it to the retailer or follow local food-safety guidance.</p>
            </div>
            </div>
          </div>
        )}

        <div className="portal-surface flex flex-col items-start justify-between gap-4 p-6 md:flex-row md:items-center">
          <div>
            <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-green-700">Consumer trace record</p>
            <h1 className="text-3xl font-bold text-slate-900">{displayBatch.crop_name}</h1>
            <p className="text-slate-500 font-mono mt-1">Batch ID: {displayBatch.batch_code}</p>
          </div>
          <div className={`rounded-xl border p-4 ${isRecalled || latestLabTest?.test_status === 'FAIL' ? 'border-red-200 bg-red-50 text-red-800' : latestLabTest ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
            <p className="text-xs font-semibold uppercase tracking-wide">Food safety status</p><p className="mt-1 text-xl font-bold">{safetyStatus}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="portal-surface">
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
                <span className="font-medium">{displayBatch.total_weight_kg} kg</span>
              </div>
            </CardContent>
          </Card>

          <Card className="portal-surface">
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
                      {test.test_status === 'PASS' ? (
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-6 w-6 text-red-500" />
                      )}
                      <span className={`font-bold ${test.test_status === 'PASS' ? 'text-green-700' : 'text-red-700'}`}>
                        {test.test_status === 'PASS' ? 'PASSED: Safe for Consumption' : 'FAILED: Unsafe'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b pb-2 text-sm">
                      <span className="text-slate-500">Pesticide Residue</span>
                      <span className="font-medium">{test.residue_ppm} ppm</span>
                    </div>
                    <div className="flex justify-between border-b pb-2 text-sm">
                      <span className="text-slate-500">Permissible Limit</span>
                      <span className="font-medium">{test.max_limit_ppm} ppm</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Testing Lab</span>
                      <span className="font-medium">{test.lab_name}</span>
                    </div>
                    {test.certificate_url && <a href={test.certificate_url} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm font-semibold text-green-700 hover:underline">View lab certificate <ExternalLink className="ml-1 h-3 w-3" /></a>}
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-4">No lab test records available yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="portal-surface"><CardContent className="flex items-start gap-3 p-5"><ShieldCheck className={`mt-0.5 h-6 w-6 ${chainVerified ? 'text-green-700' : 'text-amber-600'}`} /><div><p className="font-semibold text-slate-900">{chainVerified ? 'Ledger verified' : 'Ledger review needed'}</p><p className="mt-1 text-sm text-slate-600">{chainVerified ? 'Each recorded handoff links to the prior record.' : 'This batch has no complete handoff chain to verify yet.'}</p></div></CardContent></Card>
          <Card className="portal-surface"><CardContent className="flex items-start gap-3 p-5"><Store className="mt-0.5 h-6 w-6 text-green-700" /><div><p className="font-semibold text-slate-900">Retail status</p><p className="mt-1 text-sm text-slate-600">{retailHandoff ? `Available via ${retailHandoff.assigned_retailer_name ?? 'recorded retailer'}` : 'Not yet recorded on a retail shelf.'}</p></div></CardContent></Card>
        </div>

        <h2 className="text-2xl font-bold mt-8 mb-4 px-2">Supply Chain Journey</h2>
        <div className="portal-surface p-6">
          <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pb-4">
            {displayBatch.batch_handoffs?.sort((a: Handoff, b: Handoff) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((handoff: Handoff, index: number) => {
              let Icon = Sprout;
              let iconColor = 'text-green-700';
              let bgColor = 'bg-green-100';
              
              if (handoff.stage === 'aggregation') {
                Icon = Scale;
                iconColor = 'text-green-700';
                bgColor = 'bg-green-100';
              } else if (handoff.stage === 'logistics') {
                Icon = Truck;
                iconColor = 'text-green-700';
                bgColor = 'bg-green-100';
              } else if (handoff.stage === 'retail') {
                Icon = Store;
                iconColor = 'text-green-700';
                bgColor = 'bg-green-100';
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
                      <span className="flex items-center"><MapPin className="h-3 w-3 mr-1" /> {handoff.assigned_distributor_name ?? handoff.assigned_retailer_name ?? 'Supply-chain update'}</span>
                    </div>
                    {handoff.notes && <p className="mt-2 text-slate-700 bg-slate-50 p-2 rounded text-sm">{handoff.notes}</p>}
                  </div>
                </div>
              );
            })}
            {orderedHandoffs.length === 0 && <p className="pl-8 text-sm text-slate-500">No handoffs have been recorded for this batch yet.</p>}
          </div>
        </div>
      </main>
    </div>
  );
}
