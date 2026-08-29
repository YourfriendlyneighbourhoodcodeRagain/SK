'use server';

import { createHash } from 'crypto';
import { anchorHashOnPolygon } from '@/lib/polygon';
import { supabase } from '@/lib/supabaseClient';

export type BatchFormData = { farmerId: string; cropName: string; totalWeightKg: number; harvestDate: string; farmLocation: string };
export type BatchRecord = { id: string; farmer_id: string; batch_code: string; crop_name: string; total_weight_kg: number; harvest_date: string; farm_location: string; qr_code_url: string; status: string; is_recalled?: boolean; pesticide_status: string; data_hash: string | null; polygon_tx_hash: string | null; created_at: string; lab_tests?: { test_status: string }[] };
export type BatchHandoff = { id: string; stage: string; assigned_distributor_name: string | null; quantity_kg: number | null; notes: string | null; created_at: string };
export type BatchTrace = { batch: BatchRecord; handoffs: BatchHandoff[] };

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
  const { data: batch, error: batchError } = await supabase.from('batches').select('*, lab_tests(test_status, residue_ppm, max_limit_ppm, certificate_url, created_at)').eq('batch_code', batchCode).maybeSingle();
  if (batchError) throw new Error(batchError.message);
  if (!batch) return null;

  const { data: handoffs, error: handoffError } = await supabase.from('batch_handoffs').select('id, stage, assigned_distributor_name, quantity_kg, notes, created_at').eq('batch_id', batch.id).order('created_at', { ascending: true });
  if (handoffError) throw new Error(handoffError.message);
  return { batch: batch as BatchRecord, handoffs: (handoffs ?? []) as BatchHandoff[] };
}
