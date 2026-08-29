import Link from 'next/link';
import { AlertTriangle, Calendar, FlaskConical, MapPin, Scale } from 'lucide-react';
import { getBatchByCode, type BatchHandoff } from '@/lib/batchActions';
import { verifyBatchIntegrity, type BatchIntegrity } from '@/lib/integrity';
import { IntegrityCard, IntegrityTimelineMark } from '@/components/IntegrityDetails';

export default async function TracePage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  let batch = null;
  let handoffs: BatchHandoff[] = [];
  let integrity: BatchIntegrity | null = null;
  try {
    const trace = await getBatchByCode(batchId);
    batch = trace?.batch ?? null;
    handoffs = trace?.handoffs ?? [];
    if (batch) integrity = await verifyBatchIntegrity(batch.id);
  } catch { /* unavailable configuration is rendered as not found */ }
  if (!batch) return <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center"><AlertTriangle className="mb-4 h-14 w-14 text-amber-500" /><h1 className="text-2xl font-bold">Batch not found</h1><p className="mt-2 text-slate-600">This trace record is unavailable or its Batch ID is incorrect.</p><Link href="/" className="mt-6 font-semibold text-green-700">Return to tracking</Link></main>;
  const recalled = batch.status === 'CONTAMINATED_RECALLED' || batch.is_recalled || batch.pesticide_status === 'FAIL';
  const labStatus = batch.lab_tests?.find((test) => test.test_status === 'FAIL')?.test_status ?? batch.lab_tests?.[0]?.test_status ?? batch.pesticide_status ?? 'PENDING';
  const safetyState = recalled ? 'recalled' : labStatus === 'PASS' ? 'verified' : 'pending';
<<<<<<< HEAD
  const integrityByHandoff = new Map(integrity?.handoffs.map((handoff) => [handoff.id, handoff]));
  return <main className="min-h-screen bg-slate-50 pb-10"><header className="bg-green-700 p-4 text-white"><Link href="/" className="mx-auto block max-w-4xl text-xl font-bold">SurakshaKhadya</Link></header><section className={`p-4 text-center font-bold ${safetyState === 'recalled' ? 'bg-red-600 text-white' : safetyState === 'verified' ? 'bg-green-100 text-green-900' : 'bg-amber-100 text-amber-950'}`}>{safetyState === 'recalled' ? '⚠️ DO NOT CONSUME — FSSAI RECALL ALERT' : safetyState === 'verified' ? '✓ LAB TEST PASSED — SAFETY VERIFIED' : '⏳ LAB TEST PENDING — NOT YET VERIFIED SAFE'}</section><div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6"><div className="rounded-xl border border-slate-200 bg-white p-6"><p className="font-mono text-sm text-slate-500">{batch.batch_code}</p><h1 className="mt-1 text-3xl font-bold">{batch.crop_name}</h1></div>{integrity ? <IntegrityCard integrity={integrity} /> : <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950"><b>BLOCKCHAIN INTEGRITY · ANCHOR NOT AVAILABLE</b><p className="mt-2 text-sm">The batch history is available, but complete external verification is currently unavailable.</p></div>}<div className="grid gap-4 sm:grid-cols-2"><Info icon={<FlaskConical />} label="Pesticide lab status" value={labStatus} /><Info icon={<Scale />} label="Weight" value={`${batch.total_weight_kg} kg`} /><Info icon={<Calendar />} label="Harvest date" value={new Date(batch.harvest_date).toLocaleDateString()} /><Info icon={<MapPin />} label="Farm location" value={batch.farm_location} /></div><section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-bold text-slate-900">Supply Chain &amp; Journey Timeline</h2>{handoffs.length === 0 ? <span className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">Harvested — Awaiting first transit step</span> : <div className="mt-6 ml-2 border-l-2 border-green-200 pl-6">{handoffs.map((handoff) => { const verification = integrityByHandoff.get(handoff.id); return <div key={handoff.id} className="relative pb-6 last:pb-0"><span className={`absolute -left-[2.1rem] top-1 h-4 w-4 rounded-full border-4 border-white ring-1 ${verification?.status === 'BROKEN' ? 'bg-red-600 ring-red-200' : verification?.status === 'WARNING' ? 'bg-amber-500 ring-amber-200' : 'bg-green-600 ring-green-200'}`} /><div className="rounded-lg border border-slate-100 bg-slate-50 p-4"><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-bold uppercase tracking-wide text-green-800">{handoff.stage.replaceAll('_', ' ')}</h3><time className="text-sm text-slate-500">{new Date(handoff.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).replace(' at ', ' • ')}</time></div>{verification && <div className="mt-2"><IntegrityTimelineMark status={verification.status} /></div>}{(handoff.assigned_distributor_name || handoff.quantity_kg !== null || handoff.notes) && <div className="mt-3 space-y-1 text-sm text-slate-600">{handoff.assigned_distributor_name && <p>Distributor: <span className="font-medium text-slate-900">{handoff.assigned_distributor_name}</span></p>}{handoff.quantity_kg !== null && <p>Quantity: <span className="font-medium text-slate-900">{handoff.quantity_kg} kg</span></p>}{handoff.notes && <p>Notes: <span className="text-slate-900">{handoff.notes}</span></p>}</div>}</div></div>; })}</div>}</section></div></main>;
}
function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-green-700">{icon}<span className="text-sm font-semibold">{label}</span></div><p className="mt-2 text-lg font-bold text-slate-900">{value}</p></div>; }
=======

  const isTampered = verificationSummary?.status === 'TAMPERED';
  const isFullyVerified = verificationSummary?.status === 'VERIFIED';


  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <header className="bg-green-700 p-4 text-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight">
            SurakshaKhadya
          </Link>
          <span className="rounded-full bg-green-800/80 px-3 py-1 text-xs font-semibold text-green-100">
            Public Trace Portal
          </span>
        </div>
      </header>

      {/* Food Safety Banner (Independent of Blockchain Status) */}
      <section
        className={`p-4 text-center font-bold tracking-wide transition-colors ${
          safetyState === 'recalled'
            ? 'bg-red-600 text-white'
            : safetyState === 'verified'
              ? 'bg-green-100 text-green-900'
              : 'bg-amber-100 text-amber-950'
        }`}
      >
        {safetyState === 'recalled'
          ? '⚠️ DO NOT CONSUME — FSSAI RECALL ALERT'
          : safetyState === 'verified'
            ? '✓ LAB TEST PASSED — SAFETY VERIFIED'
            : '⏳ LAB TEST PENDING — NOT YET VERIFIED SAFE'}
      </section>

      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        {/* Batch Header */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-mono text-sm font-semibold tracking-wider text-slate-500">{batch.batch_code}</p>
              <h1 className="mt-1 text-3xl font-extrabold text-slate-900">{batch.crop_name}</h1>
            </div>
            <div className="text-right">
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Batch Status: {batch.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* BLOCKCHAIN INTEGRITY SECTION */}
        <div
          className={`rounded-2xl border p-6 shadow-sm transition-all ${
            isTampered
              ? 'border-red-300 bg-red-50/80 text-red-950'
              : isFullyVerified
                ? 'border-emerald-300 bg-emerald-50/80 text-emerald-950'
                : 'border-amber-300 bg-amber-50/80 text-amber-950'
          }`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div
                className={`rounded-xl p-3 shadow-sm ${
                  isTampered
                    ? 'bg-red-600 text-white'
                    : isFullyVerified
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 text-white'
                }`}
              >
                {isTampered ? (
                  <ShieldAlert className="h-7 w-7" />
                ) : isFullyVerified ? (
                  <ShieldCheck className="h-7 w-7" />
                ) : (
                  <ShieldCheck className="h-7 w-7" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest opacity-80">Blockchain Integrity</p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold shadow-xs ${
                      isTampered
                        ? 'bg-red-200/90 text-red-900'
                        : isFullyVerified
                          ? 'bg-emerald-200/90 text-emerald-900'
                          : 'bg-amber-200/90 text-amber-900'
                    }`}
                  >
                    {isTampered ? (
                      <>
                        <ShieldX className="h-4 w-4" />
                        ✕ TAMPER EVIDENCE DETECTED
                      </>
                    ) : isFullyVerified ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        ✓ VERIFIED
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4" />
                        ⚠ NOT FULLY ANCHORED
                      </>
                    )}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium">
                  {isTampered
                    ? 'Recorded information does not match the blockchain-anchored proof.'
                    : isFullyVerified
                      ? 'Blockchain-anchored proof matches the recorded batch history.'
                      : 'Some handoffs do not yet have blockchain proof.'}
                </p>
              </div>
            </div>

            {/* Batch Anchor Badge if available on batch level */}
            {batch.polygon_tx_hash && (
              <a
                className="inline-flex items-center gap-1.5 self-start rounded-xl bg-purple-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-800 transition-colors"
                href={`https://amoy.polygonscan.com/tx/${batch.polygon_tx_hash}`}
                target="_blank"
                rel="noreferrer"
              >
                <span>Batch on PolygonScan</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          {/* Expandable Verification Details */}
          <details className="group mt-5 border-t border-slate-200/70 pt-4">
            <summary className="flex cursor-pointer items-center justify-between font-semibold text-sm select-none hover:opacity-80">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                View verification details ({handoffs.length} supply chain stage{handoffs.length === 1 ? '' : 's'})
              </span>
              <span className="text-xs uppercase tracking-wider font-bold text-slate-600 group-open:rotate-180 transition-transform">
                ▼
              </span>
            </summary>

            <div className="mt-4 space-y-3 pt-2">
              {handoffs.length === 0 ? (
                <p className="rounded-lg bg-white/70 p-3 text-xs text-slate-600">
                  No handoffs recorded yet for this batch.
                </p>
              ) : (
                handoffs.map((handoff, index) => {
                  const hStatus = handoff.verification.status;
                  const isHVerified = hStatus === 'VERIFIED';
                  const isHTampered = hStatus === 'TAMPERED';

                  return (
                    <div
                      key={handoff.id || index}
                      className={`rounded-xl border p-4 text-xs transition-all ${
                        isHTampered
                          ? 'border-red-300 bg-red-100/60 text-red-950'
                          : isHVerified
                            ? 'border-emerald-200 bg-white/80 text-emerald-950'
                            : 'border-amber-200 bg-white/80 text-amber-950'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold uppercase tracking-wider text-sm">
                            {journeyRoleLabel(handoff)}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 font-bold ${
                              isHTampered
                                ? 'bg-red-200 text-red-800'
                                : isHVerified
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isHTampered
                              ? '✕ TAMPERED'
                              : isHVerified
                                ? '✓ VERIFIED'
                                : '⚠ NOT ANCHORED'}
                          </span>
                        </div>
                        <time className="text-slate-500">
                          {new Date(handoff.created_at).toLocaleString()}
                        </time>
                      </div>

                      <p className="mt-2 font-medium">{handoff.verification.message}</p>

                      {/* Technical breakdown */}
                      <div className="mt-3 grid gap-2 rounded-lg bg-white/90 p-3 font-mono text-[11px] text-slate-700 shadow-2xs sm:grid-cols-2">
                        <div>
                          <span className="font-semibold text-slate-500 uppercase block">Recorded Hash:</span>
                          <span className="break-all font-medium text-slate-900">
                            {handoff.verification.recordedHash || 'Not recorded'}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-500 uppercase block">Blockchain Hash:</span>
                          <span
                            className={`break-all font-medium ${
                              isHTampered ? 'text-red-700 font-bold' : 'text-slate-900'
                            }`}
                          >
                            {handoff.verification.committedHash || 'None (Unanchored)'}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-500 uppercase block">Network:</span>
                          <span className="text-slate-900">{handoff.verification.network}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-500 uppercase block">Transaction:</span>
                          {handoff.verification.txHash ? (
                            <a
                              href={handoff.verification.polygonScanUrl || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-purple-700 hover:underline break-all"
                            >
                              <span>{formatHash(handoff.verification.txHash)}</span>
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-slate-500">No transaction</span>
                          )}
                        </div>
                      </div>

                      {handoff.verification.polygonScanUrl && (
                        <div className="mt-2 text-right">
                          <a
                            href={handoff.verification.polygonScanUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:underline"
                          >
                            View on PolygonScan ↗
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </details>
        </div>

        {/* Info Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Info icon={<FlaskConical />} label="Pesticide lab status" value={labStatus} />
          <Info icon={<Scale />} label="Weight" value={`${batch.total_weight_kg} kg`} />
          <Info icon={<Calendar />} label="Harvest date" value={new Date(batch.harvest_date).toLocaleDateString()} />
          <Info icon={<MapPin />} label="Farm location" value={batch.farm_location} />
        </div>

        {/* Supply Chain & Journey Timeline */}
        <RoleTimeline batch={batch} handoffs={handoffs} />
        <section className="hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Supply Chain &amp; Journey Timeline</h2>
            <span className="text-xs font-medium text-slate-500">
              {handoffs.length} Recorded Step{handoffs.length === 1 ? '' : 's'}
            </span>
          </div>

          {handoffs.length === 0 ? (
            <div className="mt-6 text-center">
              <span className="inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
                Harvested — Awaiting first transit step
              </span>
            </div>
          ) : (
            <div className="mt-8 ml-3 border-l-2 border-green-200 pl-6 space-y-8">
              {handoffs.map((handoff, index) => {
                const hStatus = handoff.verification.status;
                const isHVerified = hStatus === 'VERIFIED';
                const isHTampered = hStatus === 'TAMPERED';

                return (
                  <div key={handoff.id || `${handoff.created_at}-${handoff.stage}-${index}`} className="relative">
                    {/* Timeline Node Dot */}
                    <span
                      className={`absolute -left-[2.15rem] top-1.5 h-4 w-4 rounded-full border-4 border-white shadow-xs ${
                        isHTampered
                          ? 'bg-red-600 ring-2 ring-red-300'
                          : isHVerified
                            ? 'bg-green-600 ring-2 ring-green-200'
                            : 'bg-amber-500 ring-2 ring-amber-200'
                      }`}
                    />

                    {/* Stage Card */}
                    <div
                      className={`rounded-xl border p-5 transition-all shadow-2xs ${
                        isHTampered
                          ? 'border-red-300 bg-red-50/70 ring-1 ring-red-200'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={`font-extrabold uppercase tracking-wide text-base ${
                              isHTampered ? 'text-red-800' : 'text-green-800'
                            }`}
                          >
                            {journeyRoleLabel(handoff)}
                          </h3>

                          {/* Individual Verification Badge */}
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              isHTampered
                                ? 'bg-red-200 text-red-900 ring-1 ring-red-300'
                                : isHVerified
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isHTampered ? (
                              <>
                                <ShieldX className="h-3.5 w-3.5 text-red-700" />
                                ✕ TAMPERED
                              </>
                            ) : isHVerified ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-700" />
                                ✓ VERIFIED
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                                ⚠ NOT ANCHORED
                              </>
                            )}
                          </span>
                        </div>

                        <time className="text-xs font-medium text-slate-500">
                          {new Date(handoff.created_at)
                            .toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                            .replace(' at ', ' • ')}
                        </time>
                      </div>

                      {/* Tamper Warning Banner if this stage was tampered */}
                      {isHTampered && (
                        <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-100/80 p-3 text-xs text-red-900">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-red-700 mt-0.5" />
                          <div>
                            <p className="font-bold">Cryptographic mismatch detected at this stage</p>
                            <p className="mt-0.5 text-red-800">
                              The recorded database hash differs from the immutable proof anchored on Polygon Amoy.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Handoff Details */}
                      {(handoff.assigned_distributor_name ||
                        handoff.assigned_retailer_name ||
                        handoff.quantity_kg !== null ||
                        handoff.notes ||
                        handoff.location) && (
                        <div className="mt-4 space-y-1.5 text-sm text-slate-600">
                          {handoff.location && (
                            <p>
                              Location:{' '}
                              <span className="font-semibold text-slate-900">{handoff.location}</span>
                            </p>
                          )}
                          {handoff.assigned_distributor_name && (
                            <p>
                              Distributor:{' '}
                              <span className="font-semibold text-slate-900">
                                {handoff.assigned_distributor_name}
                              </span>
                            </p>
                          )}
                          {handoff.assigned_retailer_name && (
                            <p>
                              Retailer:{' '}
                              <span className="font-semibold text-slate-900">
                                {handoff.assigned_retailer_name}
                              </span>
                            </p>
                          )}
                          {handoff.quantity_kg !== null && (
                            <p>
                              Quantity:{' '}
                              <span className="font-semibold text-slate-900">{handoff.quantity_kg} kg</span>
                            </p>
                          )}
                          {handoff.notes && (
                            <p>
                              Notes: <span className="text-slate-800">{handoff.notes}</span>
                            </p>
                          )}
                        </div>
                      )}

                      {/* Proof link */}
                      {handoff.verification.polygonScanUrl && (
                        <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-mono">
                            Hash: {formatHash(handoff.verification.recordedHash || '')}
                          </span>
                          <a
                            href={handoff.verification.polygonScanUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-purple-700 hover:underline"
                          >
                            View on PolygonScan ↗
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function RoleTimeline({ batch, handoffs }: { batch: NonNullable<Awaited<ReturnType<typeof getBatchByCode>>>['batch']; handoffs: BatchHandoff[] }) {
  const participants = [
    { role: 'Farmer', profile: batch.farmer_profile, records: handoffs.filter((handoff) => handoff.actor_profile?.role === 'farmer' || handoff.stage === 'harvest') },
    { role: 'Aggregator', profile: null, records: handoffs.filter((handoff) => handoff.actor_profile?.role === 'aggregator' || handoff.stage === 'aggregation') },
    { role: 'Distributor', profile: null, records: handoffs.filter((handoff) => handoff.actor_profile?.role === 'distributor') },
    { role: 'Retailer', profile: null, records: handoffs.filter((handoff) => handoff.actor_profile?.role === 'retailer' || handoff.stage === 'retail') },
  ];

  participants.forEach((participant) => {
    if (!participant.profile) participant.profile = participant.records.find((handoff) => handoff.actor_profile)?.actor_profile;
  });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Supply Chain &amp; Journey Timeline</h2>
          <p className="mt-1 text-sm text-slate-500">Farmer &rarr; Aggregator &rarr; Distributor &rarr; Retailer</p>
        </div>
        <span className="text-xs font-medium text-slate-500">4 Steps</span>
      </div>
      <div className="relative mt-8 ml-3 space-y-8 border-l-2 border-green-200 pl-6">
        {participants.map((participant) => (
          <div key={participant.role} className="relative">
            <span className="absolute -left-[2.15rem] top-1.5 h-4 w-4 rounded-full border-4 border-white bg-amber-500 shadow ring-2 ring-amber-200" />
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-extrabold uppercase tracking-wide text-green-800">{participant.role}</h3>
                <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  {participant.profile || participant.records.length ? 'RECORDED' : 'AWAITING'}
                </span>
              </div>
              <p className="mt-3 font-semibold text-slate-900">{participant.profile?.full_name ?? 'Details not recorded'}</p>
              <p className="mt-1 text-sm text-slate-600">{participant.profile?.location ?? participant.records.find((handoff) => handoff.location)?.location ?? 'Location not recorded'}</p>
              {participant.records.length > 0 ? participant.records.map((handoff) => (
                <div key={handoff.id} className="mt-3 border-t border-slate-200 pt-3 text-sm text-slate-600">
                  {handoff.quantity_kg !== null && handoff.quantity_kg !== undefined && <p>Quantity: <span className="font-semibold text-slate-900">{handoff.quantity_kg} kg</span></p>}
                  {handoff.assigned_distributor_name && <p>Distributor: <span className="font-semibold text-slate-900">{handoff.assigned_distributor_name}</span></p>}
                  {handoff.assigned_retailer_name && <p>Retailer: <span className="font-semibold text-slate-900">{handoff.assigned_retailer_name}</span></p>}
                  {handoff.notes && <p>Notes: <span className="text-slate-800">{handoff.notes}</span></p>}
                </div>
              )) : <p className="mt-3 text-sm text-slate-500">No handoff details recorded yet.</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function journeyRoleLabel(handoff: BatchHandoff) {
  const role = handoff.actor_profile?.role;
  if (role) return role.charAt(0).toUpperCase() + role.slice(1);
  if (handoff.stage === 'harvest') return 'Farmer';
  if (handoff.stage === 'aggregation') return 'Aggregator';
  if (handoff.stage === 'retail') return 'Retailer';
  return 'Distributor';
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="flex items-center gap-2 text-green-700">
        {icon}
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <p className="mt-2 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

>>>>>>> 9affdaf (flowchart)
