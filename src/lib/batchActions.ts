'use server';

import { createHash } from 'crypto';
import { recordBatchOnPolygon } from '@/lib/blockchain';
import { supabase } from '@/lib/supabaseClient';

export type BatchFormData = { farmerId: string; cropName: string; totalWeightKg: number; harvestDate: string; farmLocation: string };
export type BatchRecord = { id: string; farmer_id: string; batch_code: string; crop_name: string; total_weight_kg: number; harvest_date: string; farm_location: string; qr_code_url: string; status: string; pesticide_status: string; data_hash: string | null; polygon_tx_hash: string | null; created_at: string; lab_tests?: { test_status: string }[] };
export type BatchHandoff = { stage: string; assigned_distributor_name: string | null; quantity_kg: number | null; notes: string | null; created_at: string };
export type BatchTrace = { batch: BatchRecord; handoffs: BatchHandoff[] };
export type RetailerAcceptanceResult = { success: true } | { success: false; error: string };

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
  const polygonTxHash = await recordBatchOnPolygon(dataHash).catch(() => null);
  const { data, error } = await supabase.from('batches').insert({ farmer_id: formData.farmerId, batch_code: batchCode, crop_name: formData.cropName, total_weight_kg: formData.totalWeightKg, harvest_date: formData.harvestDate, farm_location: formData.farmLocation, qr_code_url: qrCodeUrl, data_hash: dataHash, polygon_tx_hash: polygonTxHash }).select().single();
  if (error) throw new Error(error.message);
  return data as BatchRecord;
}

export async function acceptBatchByRetailer({ batchCode, storeLocation }: { batchCode: string; storeLocation: string }): Promise<RetailerAcceptanceResult> {
  getConfig();
  const { data: batch, error: batchError } = await supabase.from('batches').select('id, is_recalled').eq('batch_code', batchCode.trim()).maybeSingle();
  if (batchError) return { success: false, error: batchError.message };
  if (!batch) return { success: false, error: 'Batch code not found' };
  if (batch.is_recalled === true) return { success: false, error: 'Cannot accept: This batch has been RECALLED due to contamination!' };

  const { error: handoffError } = await supabase.from('batch_handoffs').insert({ batch_id: batch.id, stage: 'STORE_ACCEPTED', assigned_retailer_name: storeLocation, notes: `Received on store shelf at ${storeLocation}` });
  if (handoffError) return { success: false, error: handoffError.message };
  const { error: updateError } = await supabase.from('batches').update({ status: 'ON_SHELF' }).eq('id', batch.id);
  if (updateError) return { success: false, error: updateError.message };
  return { success: true };
}

export async function getBatchByCode(batchCode: string): Promise<BatchTrace | null> {
  getConfig();
  const { data: batch, error: batchError } = await supabase.from('batches').select('*, lab_tests(test_status, residue_ppm, max_limit_ppm, certificate_url, created_at)').eq('batch_code', batchCode).maybeSingle();
  if (batchError) throw new Error(batchError.message);
  if (!batch) return null;

  const { data: handoffs, error: handoffError } = await supabase.from('batch_handoffs').select('stage, assigned_distributor_name, quantity_kg, notes, created_at').eq('batch_id', batch.id).order('created_at', { ascending: true });
  if (handoffError) throw new Error(handoffError.message);
  return { batch: batch as BatchRecord, handoffs: (handoffs ?? []) as BatchHandoff[] };
}
