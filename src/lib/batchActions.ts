'use server';

import { createHash } from 'crypto';
import { anchorHashOnPolygon } from '@/lib/polygon';
import { supabase } from '@/lib/supabaseClient';

export type BatchFormData = { farmerId: string; cropName: string; totalWeightKg: number; harvestDate: string; farmLocation: string };
<<<<<<< HEAD
export type BatchRecord = { id: string; farmer_id: string; batch_code: string; crop_name: string; total_weight_kg: number; harvest_date: string; farm_location: string; qr_code_url: string; status: string; is_recalled?: boolean; pesticide_status: string; data_hash: string | null; polygon_tx_hash: string | null; created_at: string; lab_tests?: { test_status: string }[] };
export type BatchHandoff = { id: string; stage: string; assigned_distributor_name: string | null; quantity_kg: number | null; notes: string | null; created_at: string };
export type BatchTrace = { batch: BatchRecord; handoffs: BatchHandoff[] };
=======
export type BatchRecord = {
  id: string;
  farmer_id: string;
  batch_code: string;
  crop_name: string;
  total_weight_kg: number;
  harvest_date: string;
  farm_location: string;
  qr_code_url: string;
  status: string;
  is_recalled: boolean;
  pesticide_status: string;
  data_hash: string | null;
  polygon_tx_hash: string | null;
  created_at: string;
  farmer_profile?: ProfileSummary | null;
  lab_tests?: {
    test_status: string;
    residue_ppm?: number;
    max_limit_ppm?: number;
    certificate_url?: string | null;
    created_at?: string;
  }[];
};

type ProfileSummary = { full_name: string; location: string | null; role: string };

export type BatchHandoff = VerifiedHandoff;

export type BatchTrace = {
  batch: BatchRecord;
  handoffs: BatchHandoff[];
  verificationSummary: BatchVerificationSummary;
};
>>>>>>> 9affdaf (flowchart)

function getConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.startsWith('http') || !key) throw new Error('Supabase environment variables are missing or invalid.');
}

export async function createBatch(formData: BatchFormData): Promise<BatchRecord> {
  getConfig();
  const batchCode = `SK-2026-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const traceUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/trace/${batchCode}`;
  const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(traceUrl)}&size=300`;
  const dataHash = createHash('sha256').update(JSON.stringify({ ...formData, batchCode })).digest('hex');
  const polygonTxHash = process.env.POLYGON_PRIVATE_KEY ? await anchorHashOnPolygon(dataHash) : null;
  const { data, error } = await supabase.from('batches').insert({ farmer_id: formData.farmerId, batch_code: batchCode, crop_name: formData.cropName, total_weight_kg: formData.totalWeightKg, harvest_date: formData.harvestDate, farm_location: formData.farmLocation, qr_code_url: qrCodeUrl, data_hash: dataHash, polygon_tx_hash: polygonTxHash }).select().single();
  if (error) throw new Error(error.message);
  return data as BatchRecord;
}

export async function getBatchByCode(batchCode: string): Promise<BatchTrace | null> {
  getConfig();
<<<<<<< HEAD
  const { data: batch, error: batchError } = await supabase.from('batches').select('*, lab_tests(test_status, residue_ppm, max_limit_ppm, certificate_url, created_at)').eq('batch_code', batchCode).maybeSingle();
  if (batchError) throw new Error(batchError.message);
  if (!batch) return null;

  const { data: handoffs, error: handoffError } = await supabase.from('batch_handoffs').select('id, stage, assigned_distributor_name, quantity_kg, notes, created_at').eq('batch_id', batch.id).order('created_at', { ascending: true });
  if (handoffError) throw new Error(handoffError.message);
  return { batch: batch as BatchRecord, handoffs: (handoffs ?? []) as BatchHandoff[] };
=======
  const { data: batch, error: batchError } = await supabase
    .from('batches')
    .select('*, farmer_profile:profiles!batches_farmer_id_fkey(full_name, location, role), lab_tests(test_status, residue_ppm, max_limit_ppm, certificate_url, created_at)')
    .eq('batch_code', batchCode)
    .maybeSingle();

  if (batchError) throw new Error(batchError.message);
  if (!batch) return null;

  const { data: rawHandoffs, error: handoffError } = await supabase
    .from('batch_handoffs')
    .select('id, batch_id, handler_id, stage, location, notes, assigned_distributor_name, assigned_retailer_name, quantity_kg, created_at, prev_hash, current_hash, ledger_version, actor_profile:profiles!batch_handoffs_handler_id_fkey(full_name, location, role)')
    .eq('batch_id', batch.id)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  if (handoffError) throw new Error(handoffError.message);

  const handoffs = (rawHandoffs ?? []).map((handoff) => ({
    ...handoff,
    actor_profile: Array.isArray(handoff.actor_profile) ? handoff.actor_profile[0] ?? null : handoff.actor_profile,
  })) as HandoffRecord[];
  let anchors: HandoffAnchor[] = [];

  if (handoffs.length > 0) {
    const handoffIds = handoffs.map((h) => h.id);
    const { data: anchorData, error: anchorError } = await supabase
      .from('handoff_blockchain_anchors')
      .select('id, handoff_id, tx_hash, committed_hash, network, created_at')
      .in('handoff_id', handoffIds);

    if (!anchorError && anchorData) {
      anchors = anchorData as HandoffAnchor[];
    }
  }

  const verificationSummary = summarizeBatchVerification(handoffs, anchors);

  return {
    batch: batch as BatchRecord,
    handoffs: verificationSummary.handoffs,
    verificationSummary,
  };
>>>>>>> 9affdaf (flowchart)
}
