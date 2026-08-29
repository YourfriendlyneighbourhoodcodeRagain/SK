'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PortalShell } from '@/components/portal-shell';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { verifyLedgerEntries, type LedgerEntry } from '@/lib/ledger-core';
import {
  summarizeBatchVerification,
  type BatchVerificationSummary,
  type HandoffAnchor,
  type HandoffRecord,
} from '@/lib/blockchain';

type LabTest = {
  test_status: 'PASS' | 'FAIL';
  residue_ppm: number;
  max_limit_ppm: number;
  lab_name: string;
  certificate_url: string | null;
  created_at: string;
};

type Handoff = HandoffRecord;

type Batch = {
  id: string;
  batch_code: string;
  crop_name: string;
  farm_location: string;
  status: string;
  is_recalled: boolean;
  created_at: string;
  lab_tests: LabTest[];
  batch_handoffs: Handoff[];
  verificationSummary?: BatchVerificationSummary;
};

export default function RegulatorDashboard() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'recalls' | 'failed' | 'tampered'>('all');
  const [labFilter, setLabFilter] = useState<'all' | 'passed' | 'pending' | 'failed'>('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [selectedBatchCode, setSelectedBatchCode] = useState('');
  const [message, setMessage] = useState('Loading compliance records…');
  const [loading, setLoading] = useState(true);
  const [recallReason, setRecallReason] = useState('');
  const [recalling, setRecalling] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const initiateRecall = async (batch: Batch) => {
    const reason = recallReason.trim();

    if (!reason) {
      setMessage('Please enter a recall reason.');
      return;
    }

    setRecalling(true);
    setMessage('');

    try {
      const { error } = await supabase.rpc('initiate_batch_recall', {
        p_batch_id: batch.id,
        p_reason: reason,
      });

      if (error) {
        throw new Error(error.message);
      }

      setRecallReason('');
      setMessage(`Recall initiated successfully for ${batch.batch_code}.`);

      await loadBatches();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not initiate recall.');
    } finally {
      setRecalling(false);
    }
  };

  const loadBatches = useCallback(async () => {
    setLoading(true);
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) {
      setMessage('Sign in with a regulator account to view the compliance dashboard.');
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    if (profile?.role !== 'regulator') {
      setMessage('This dashboard is available to regulator accounts only.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('batches')
      .select(
        'id, batch_code, crop_name, farm_location, status, is_recalled, created_at, lab_tests(test_status, residue_ppm, max_limit_ppm, lab_name, certificate_url, created_at), batch_handoffs(id, created_at, stage, assigned_distributor_name, assigned_retailer_name, notes, handler_id, location, prev_hash, current_hash, ledger_version)'
      )
      .order('created_at', { ascending: false });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const rawBatches = (data ?? []) as Batch[];
    const allHandoffIds = rawBatches.flatMap((b) => (b.batch_handoffs ?? []).map((h) => h.id).filter(Boolean));

    const anchorMap = new Map<string, HandoffAnchor>();
    if (allHandoffIds.length > 0) {
      const { data: anchors, error: anchorError } = await supabase
        .from('handoff_blockchain_anchors')
        .select('id, handoff_id, tx_hash, committed_hash, network, created_at')
        .in('handoff_id', allHandoffIds);

      if (!anchorError && anchors) {
        for (const a of anchors as HandoffAnchor[]) {
          if (a.handoff_id) {
            anchorMap.set(a.handoff_id, a);
          }
        }
      }
    }

    const augmentedBatches: Batch[] = rawBatches.map((batch) => {
      const handoffs = (batch.batch_handoffs ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at));
      const batchAnchors = handoffs
        .map((h) => anchorMap.get(h.id))
        .filter((a): a is HandoffAnchor => a !== undefined);

      const verificationSummary = summarizeBatchVerification(handoffs, batchAnchors);
      return {
        ...batch,
        batch_handoffs: handoffs,
        verificationSummary,
      };
    });

    setBatches(augmentedBatches);
    setMessage('');
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBatches();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadBatches]);

  const failedTest = (batch: Batch) => batch.lab_tests.some((test) => test.test_status === 'FAIL');

  const chainStatus = (batch: Batch) => {
    if (batch.batch_handoffs.length === 0) return 'NO_HANDOFFS' as const;
    const ledgerEntries = batch.batch_handoffs
      .filter((handoff) => handoff.ledger_version === 1 && handoff.prev_hash && handoff.current_hash)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(
        (handoff) =>
          ({
            batchId: batch.id,
            actorId: handoff.handler_id || '',
            stage: handoff.stage,
            location: handoff.location ?? '',
            notes: handoff.notes ?? '',
            createdAt: handoff.created_at,
            prevHash: handoff.prev_hash!,
            currentHash: handoff.current_hash!,
          }) satisfies LedgerEntry
      );
    if (ledgerEntries.length === 0) return 'LEGACY' as const;
    return verifyLedgerEntries(ledgerEntries).valid ? ('VERIFIED' as const) : ('BROKEN' as const);
  };

  const chainIssue = (batch: Batch) => {
    return batch.verificationSummary?.status === 'TAMPERED' || chainStatus(batch) === 'BROKEN';
  };

  const visibleBatches = batches.filter((batch) => {
    const matchesSearch = `${batch.batch_code} ${batch.crop_name} ${batch.farm_location}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesLocation = !locationFilter || batch.farm_location.toLowerCase().includes(locationFilter.toLowerCase());
    const matchesPrimaryFilter =
      filter === 'all' ||
      (filter === 'recalls' && batch.is_recalled) ||
      (filter === 'failed' && failedTest(batch)) ||
      (filter === 'tampered' && batch.verificationSummary?.status === 'TAMPERED');
    const matchesLab =
      labFilter === 'all' ||
      (labFilter === 'pending' && batch.lab_tests.length === 0) ||
      (labFilter === 'passed' && batch.lab_tests.length > 0 && !failedTest(batch)) ||
      (labFilter === 'failed' && failedTest(batch));
    return matchesSearch && matchesLocation && matchesPrimaryFilter && matchesLab;
  });

  const recalls = batches.filter((batch) => batch.is_recalled).length;
  const failed = batches.filter(failedTest).length;
  const tamperedBatches = batches.filter((batch) => batch.verificationSummary?.status === 'TAMPERED');
  const chainWarningsCount = batches.filter(chainIssue).length;
  const pendingTests = batches.filter((batch) => batch.lab_tests.length === 0).length;
  const alertBatches = batches.filter((batch) => batch.is_recalled || failedTest(batch) || chainIssue(batch));
  const selectedBatch = visibleBatches.find((batch) => batch.batch_code === selectedBatchCode) ?? visibleBatches[0];

  const exportReport = () => {
    const rows = visibleBatches.map((batch) =>
      [
        batch.batch_code,
        batch.crop_name,
        batch.farm_location,
        batch.status,
        batch.is_recalled ? 'Recalled' : 'Active',
        batch.lab_tests.length === 0 ? 'Pending' : failedTest(batch) ? 'Failed' : 'Passed',
        batch.verificationSummary?.status || 'UNKNOWN',
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(',')
    );
    const file = new Blob([['Batch ID,Crop,Farm location,Status,Recall,Lab safety,Blockchain verification', ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'surakshakhadya-compliance-report.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PortalShell
        title="Regulator compliance console"
        description="Food safety oversight and traceability audit."
        icon={ShieldCheck}
        showWorkspaceLink={false}
        onHistoryClick={() => setShowHistory(true)}
      >
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => void loadBatches()} disabled={loading} className="bg-green-700 hover:bg-green-800">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

          {message && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">{message}</div>}

          {/* Stat Cards */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Tracked batches" value={batches.length} icon={<ClipboardCheck className="text-green-700" />} />
            <StatCard label="Pending lab tests" value={pendingTests} icon={<ClipboardCheck className="text-amber-600" />} />
            <StatCard label="Active recalls" value={recalls} icon={<AlertTriangle className="text-red-600" />} tone="red" />
            <StatCard label="Failed lab tests" value={failed} icon={<ShieldX className="text-red-600" />} tone="red" />
            <StatCard
              label="Chain warnings"
              value={chainWarningsCount}
              icon={chainWarningsCount > 0 ? <ShieldAlert className="text-red-600" /> : <ShieldCheck className="text-green-700" />}
              tone={chainWarningsCount > 0 ? 'red' : 'default'}
            />
          </section>

          {/* Filter Bar */}
          <Card className="portal-surface">
            <CardContent className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-5">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Batch ID or crop"
                className="portal-field"
              />
              <Input
                value={locationFilter}
                onChange={(event) => setLocationFilter(event.target.value)}
                placeholder="Farm location / district"
                className="portal-field"
              />
              <select
                value={labFilter}
                onChange={(event) => setLabFilter(event.target.value as typeof labFilter)}
                className="portal-field h-9 rounded-lg px-3 text-sm"
              >
                <option value="all">All lab outcomes</option>
                <option value="passed">Lab passed</option>
                <option value="pending">Lab pending</option>
                <option value="failed">Lab failed</option>
              </select>
              <select
                value={selectedBatchCode}
                onChange={(event) => setSelectedBatchCode(event.target.value)}
                className="portal-field h-9 rounded-lg px-3 text-sm"
              >
                <option value="">Select a visible batch</option>
                {visibleBatches.map((batch) => (
                  <option key={batch.id} value={batch.batch_code}>
                    {batch.batch_code}
                  </option>
                ))}
              </select>
              <Button onClick={exportReport} variant="outline" className="border-green-200 text-green-700 hover:bg-green-50">
                <Download className="mr-2 h-4 w-4" />
                Export report
              </Button>
            </CardContent>
          </Card>

          {/* BLOCKCHAIN INTEGRITY ALERT QUEUE (FOR TAMPERED BATCHES) */}
          {tamperedBatches.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-red-900 font-extrabold text-lg">
                <ShieldAlert className="h-6 w-6 text-red-600" />
                <h2>Blockchain Integrity Alerts ({tamperedBatches.length})</h2>
              </div>
              <div className="grid gap-4">
                {tamperedBatches.map((batch) => {
                  const tamperedHandoff = batch.verificationSummary?.handoffs.find(
                    (h) => h.verification.status === 'TAMPERED'
                  );
                  return (
                    <Card key={batch.id} className="border-2 border-red-500 bg-red-50/90 shadow-md">
                      <CardHeader className="pb-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <CardTitle className="flex items-center text-red-900 text-lg">
                            <AlertTriangle className="mr-2 h-5 w-5 text-red-600" />
                            INTEGRITY ALERT
                          </CardTitle>
                          <Badge variant="destructive" className="bg-red-700 font-bold">
                            TAMPER EVIDENCE DETECTED
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 rounded-xl bg-white p-4 text-xs font-medium text-slate-700 shadow-2xs">
                          <div>
                            <span className="text-slate-500 uppercase font-bold block">Batch ID:</span>
                            <span className="font-mono text-sm font-bold text-slate-900">{batch.batch_code}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 uppercase font-bold block">Crop:</span>
                            <span className="text-sm font-semibold text-slate-900">{batch.crop_name}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 uppercase font-bold block">Affected Stage:</span>
                            <span className="font-bold text-red-800 uppercase text-sm">
                              {batch.verificationSummary?.tamperedStages.join(', ') || 'Logistics'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 uppercase font-bold block">Verification Status:</span>
                            <span className="font-bold text-red-700">TAMPER EVIDENCE DETECTED</span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-slate-500 uppercase font-bold block">Recorded Hash:</span>
                            <span className="font-mono text-[11px] break-all text-slate-900">
                              {tamperedHandoff?.verification.recordedHash || 'N/A'}
                            </span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-slate-500 uppercase font-bold block">Blockchain Hash:</span>
                            <span className="font-mono text-[11px] break-all text-red-700 font-bold">
                              {tamperedHandoff?.verification.committedHash || 'N/A'}
                            </span>
                          </div>
                          {tamperedHandoff?.verification.txHash && (
                            <div className="sm:col-span-3">
                              <span className="text-slate-500 uppercase font-bold block">Transaction Hash:</span>
                              <a
                                href={tamperedHandoff.verification.polygonScanUrl || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-mono text-[11px] text-purple-700 hover:underline break-all"
                              >
                                <span>{tamperedHandoff.verification.txHash}</span>
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-500 uppercase font-bold block">Timestamp:</span>
                            <span className="text-[11px] text-slate-700">
                              {tamperedHandoff ? new Date(tamperedHandoff.created_at).toLocaleString() : 'N/A'}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <Link
                            href={`/trace/${encodeURIComponent(batch.batch_code)}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-4 py-2 text-xs font-bold text-red-800 hover:bg-red-50 shadow-xs"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            VIEW TRACE
                          </Link>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedBatchCode(batch.batch_code);
                              document.getElementById('batch-detail-section')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="bg-red-700 text-xs font-bold hover:bg-red-800"
                          >
                            INVESTIGATE
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Compliance Alert Queue (For non-tampered alerts like recalls / lab failures) */}
          {alertBatches.length > 0 && tamperedBatches.length === 0 && (
            <Card className="rounded-xl border border-red-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-red-800">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Compliance alert queue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {alertBatches.slice(0, 5).map((batch) => (
                  <div
                    key={batch.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm"
                  >
                    <span className="font-mono font-semibold text-slate-900">{batch.batch_code}</span>
                    <span className="text-red-800">
                      {batch.is_recalled
                        ? 'Active recall'
                        : failedTest(batch)
                          ? 'Lab test failed'
                          : 'Blockchain audit alert'}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Register Table */}
          <Card className="portal-surface">
            <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Batch compliance register</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search batch, crop, location"
                  className="portal-field w-56"
                />
                <Button
                  className={filter === 'all' ? 'portal-action' : ''}
                  variant={filter === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={filter === 'recalls' ? 'destructive' : 'outline'}
                  onClick={() => setFilter('recalls')}
                >
                  Recalls
                </Button>
                <Button
                  className={filter === 'failed' ? 'portal-action' : ''}
                  variant={filter === 'failed' ? 'default' : 'outline'}
                  onClick={() => setFilter('failed')}
                >
                  Lab failures
                </Button>
                <Button
                  className={filter === 'tampered' ? 'bg-red-700 hover:bg-red-800 text-white' : 'border-red-200 text-red-700 hover:bg-red-50'}
                  variant={filter === 'tampered' ? 'default' : 'outline'}
                  onClick={() => setFilter('tampered')}
                >
                  Tampered
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Lab safety</TableHead>
                    <TableHead>Blockchain verification</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trace</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!loading && visibleBatches.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                        No matching batches found.
                      </TableCell>
                    </TableRow>
                  )}
                  {visibleBatches.map((batch) => {
                    const bStatus = batch.verificationSummary?.status;
                    const isTampered = bStatus === 'TAMPERED';
                    const isVerified = bStatus === 'VERIFIED';

                    return (
                      <TableRow key={batch.id}>
                        <TableCell>
                          <p className="font-mono font-semibold">{batch.batch_code}</p>
                          <p className="text-xs text-slate-500">{batch.crop_name}</p>
                        </TableCell>
                        <TableCell>{batch.farm_location}</TableCell>
                        <TableCell>
                          {batch.lab_tests.length === 0 ? (
                            <Badge variant="outline">Pending</Badge>
                          ) : failedTest(batch) ? (
                            <Badge variant="destructive">Failed</Badge>
                          ) : (
                            <Badge className="bg-emerald-600">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Passed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {isTampered ? (
                            <Badge variant="destructive" className="bg-red-600">
                              <ShieldX className="mr-1 h-3 w-3" />
                              ✕ TAMPERED
                            </Badge>
                          ) : isVerified ? (
                            <Badge className="bg-emerald-600">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              ✓ VERIFIED
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-400 text-amber-800 bg-amber-50">
                              <AlertTriangle className="mr-1 h-3 w-3 text-amber-600" />
                              ⚠ NOT ANCHORED
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={batch.is_recalled ? 'destructive' : 'secondary'}>
                            {batch.is_recalled ? 'RECALLED' : batch.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/trace/${encodeURIComponent(batch.batch_code)}`}
                            className="inline-flex items-center text-sm font-medium text-green-700 hover:underline"
                          >
                            Open <ExternalLink className="ml-1 h-3 w-3" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Batch Detail Card */}
          {selectedBatch && (
            <div id="batch-detail-section">
              <Card className="portal-surface">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle>Batch detail: {selectedBatch.batch_code}</CardTitle>
                      <p className="text-sm text-slate-600">Handoffs and lab results are read-only compliance records.</p>
                    </div>
                    <div>
                      {selectedBatch.verificationSummary?.status === 'TAMPERED' ? (
                        <Badge variant="destructive" className="bg-red-600 text-xs">
                          ✕ TAMPER EVIDENCE DETECTED
                        </Badge>
                      ) : selectedBatch.verificationSummary?.status === 'VERIFIED' ? (
                        <Badge className="bg-emerald-600 text-xs">✓ ALL ANCHORS VERIFIED</Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-400 text-amber-800 bg-amber-50 text-xs">
                          ⚠ NOT FULLY ANCHORED
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-2">
                  {/* Trace timeline */}
                  <div>
                    <h3 className="mb-3 font-semibold text-slate-900">
                      Trace timeline ({selectedBatch.batch_handoffs.length} stages)
                    </h3>
                    <div className="space-y-3">
                      {selectedBatch.batch_handoffs.length === 0 ? (
                        <p className="text-sm text-slate-500">No handoffs recorded yet.</p>
                      ) : (
                        selectedBatch.verificationSummary?.handoffs.map((handoff, index) => {
                          const isTampered = handoff.verification.status === 'TAMPERED';
                          const isVerified = handoff.verification.status === 'VERIFIED';

                          return (
                            <div
                              key={`${handoff.stage}-${index}`}
                              className={`rounded-lg border p-3 text-sm transition-all ${
                                isTampered
                                  ? 'border-red-300 bg-red-50 text-red-950 ring-1 ring-red-200'
                                  : isVerified
                                    ? 'border-emerald-200 bg-white text-slate-900'
                                    : 'border-slate-200 bg-slate-50 text-slate-900'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-1">
                                <p className="font-bold capitalize text-slate-900">
                                  {handoff.stage.replaceAll('_', ' ')} ·{' '}
                                  {handoff.assigned_distributor_name ||
                                    handoff.assigned_retailer_name ||
                                    'Supply-chain update'}
                                </p>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                    isTampered
                                      ? 'bg-red-200 text-red-900'
                                      : isVerified
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {isTampered
                                    ? '✕ TAMPERED'
                                    : isVerified
                                      ? '✓ VERIFIED'
                                      : '⚠ NOT ANCHORED'}
                                </span>
                              </div>

                              <p className="mt-1 text-xs text-slate-500">
                                {new Date(handoff.created_at).toLocaleString()}
                              </p>

                              {handoff.notes && <p className="mt-2 text-xs text-slate-600">{handoff.notes}</p>}

                              {/* Blockchain Proof Summary */}
                              <div className="mt-2.5 rounded border border-slate-100 bg-slate-50/80 p-2 font-mono text-[10px] text-slate-700 space-y-1">
                                <div>
                                  <span className="text-slate-500 font-sans font-semibold">Recorded: </span>
                                  <span className="break-all">{handoff.verification.recordedHash || 'None'}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 font-sans font-semibold">Anchored: </span>
                                  <span
                                    className={`break-all ${
                                      isTampered ? 'text-red-700 font-bold' : ''
                                    }`}
                                  >
                                    {handoff.verification.committedHash || 'Not anchored'}
                                  </span>
                                </div>
                                {handoff.verification.polygonScanUrl && (
                                  <div className="pt-1 text-right">
                                    <a
                                      href={handoff.verification.polygonScanUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 font-sans font-semibold text-purple-700 hover:underline"
                                    >
                                      View on PolygonScan ↗
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Residue testing */}
                  <div>
                    <h3 className="mb-3 font-semibold text-slate-900">Residue testing</h3>
                    <div className="space-y-3">
                      {selectedBatch.lab_tests.length === 0 ? (
                        <p className="text-sm text-slate-500">No lab test is attached yet.</p>
                      ) : (
                        selectedBatch.lab_tests.map((test, index) => (
                          <div
                            key={`${test.lab_name}-${index}`}
                            className={`rounded-lg border p-3 text-sm ${
                              test.test_status === 'FAIL'
                                ? 'border-red-200 bg-red-50 text-red-900'
                                : 'border-green-100 bg-white text-slate-900'
                            }`}
                          >
                            <p className="font-medium text-slate-900">
                              {test.lab_name} · {test.test_status}
                            </p>
                            <p className="mt-1 text-slate-600">
                              {test.residue_ppm} ppm / limit {test.max_limit_ppm} ppm
                            </p>
                            {test.certificate_url && (
                              <a
                                href={test.certificate_url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex text-green-700 hover:underline"
                              >
                                Open certificate <ExternalLink className="ml-1 h-3 w-3" />
                              </a>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Initiate Recall Section */}
                  {!selectedBatch.is_recalled && (
                    <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 lg:col-span-2">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-red-100 p-2 text-red-700">
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-red-800">Initiate food-safety recall</h3>
                          <p className="mt-1 text-sm text-red-700">
                            This will mark the batch as recalled and trigger downstream notifications and stock blocking.
                          </p>
                          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                            <Input
                              value={recallReason}
                              onChange={(event) => setRecallReason(event.target.value)}
                              placeholder="Enter recall reason"
                              className="bg-white"
                              disabled={recalling}
                            />
                            <Button
                              variant="destructive"
                              onClick={() => void initiateRecall(selectedBatch)}
                              disabled={recalling || !recallReason.trim()}
                              className="shrink-0"
                            >
                              <AlertTriangle className="mr-2 h-4 w-4" />
                              {recalling ? 'Initiating…' : 'Initiate Recall'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </PortalShell>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Batches</DialogTitle>
            <DialogDescription>{batches.length} batch{batches.length !== 1 ? 'es' : ''} in compliance register</DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Lab safety</TableHead>
                <TableHead>Blockchain verification</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trace</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => {
                const bStatus = batch.verificationSummary?.status;
                const isTampered = bStatus === 'TAMPERED';
                const isVerified = bStatus === 'VERIFIED';

                return (
                  <TableRow key={batch.id}>
                    <TableCell>
                      <p className="font-mono font-semibold">{batch.batch_code}</p>
                      <p className="text-xs text-slate-500">{batch.crop_name}</p>
                    </TableCell>
                    <TableCell>{batch.farm_location}</TableCell>
                    <TableCell>
                      {batch.lab_tests.length === 0 ? (
                        <Badge variant="outline">Pending</Badge>
                      ) : failedTest(batch) ? (
                        <Badge variant="destructive">Failed</Badge>
                      ) : (
                        <Badge className="bg-emerald-600">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Passed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isTampered ? (
                        <Badge variant="destructive" className="bg-red-600">
                          <ShieldX className="mr-1 h-3 w-3" />
                          ✕ TAMPERED
                        </Badge>
                      ) : isVerified ? (
                        <Badge className="bg-emerald-600">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          ✓ VERIFIED
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-400 text-amber-800 bg-amber-50">
                          <AlertTriangle className="mr-1 h-3 w-3 text-amber-600" />
                          ⚠ NOT ANCHORED
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={batch.is_recalled ? 'destructive' : 'secondary'}>
                        {batch.is_recalled ? 'RECALLED' : batch.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/trace/${encodeURIComponent(batch.batch_code)}`}
                        className="inline-flex items-center text-sm font-medium text-green-700 hover:underline"
                      >
                        Open <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone?: 'default' | 'red';
}) {
  const toneClass = tone === 'red' ? 'border-red-200' : 'border-green-100';
  return (
    <Card className={`rounded-xl ${toneClass} bg-white shadow-sm`}>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        {icon}
      </CardContent>
    </Card>
  );
}
