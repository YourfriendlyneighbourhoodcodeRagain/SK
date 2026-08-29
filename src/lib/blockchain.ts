import { supabase } from './supabaseClient.ts';
import { hashHandoff, LEDGER_GENESIS_HASH, type LedgerEntry } from './ledger-core.ts';
import { polygonExplorerTxUrl } from './polygon.ts';

export { canonicalHandoffPayload, hashHandoff, LEDGER_GENESIS_HASH, verifyLedgerEntries } from './ledger-core.ts';
export { polygonExplorerTxUrl } from './polygon.ts';


export type HandoffStage = 'harvest' | 'aggregation' | 'logistics' | 'retail';

export type RecordHandoffInput = {
  batchId: string;
  stage: HandoffStage;
  location?: string;
  notes?: string;
  assignedDistributorName?: string;
  assignedRetailerName?: string;
  quantityKg?: number;
};

export type HandoffBlockchainStatus = 'VERIFIED' | 'NOT_ANCHORED' | 'TAMPERED';

export type HandoffAnchor = {
  id?: string;
  handoff_id: string;
  tx_hash: string;
  committed_hash: string;
  network?: string | null;
  created_at?: string;
};

export type HandoffRecord = {
  id: string;
  batch_id?: string;
  handler_id?: string | null;
  stage: string;
  location?: string | null;
  notes?: string | null;
  assigned_distributor_name?: string | null;
  assigned_retailer_name?: string | null;
  quantity_kg?: number | null;
  created_at: string;
  prev_hash?: string | null;
  current_hash?: string | null;
  ledger_version?: number;
};

export type HandoffVerificationResult = {
  status: HandoffBlockchainStatus;
  headline: string;
  message: string;
  isAnchored: boolean;
  isTampered: boolean;
  isVerified: boolean;
  recordedHash: string | null;
  committedHash: string | null;
  txHash: string | null;
  network: string;
  polygonScanUrl: string | null;
};

export type VerifiedHandoff = HandoffRecord & {
  anchor?: HandoffAnchor | null;
  verification: HandoffVerificationResult;
};

export type BatchBlockchainStatus = 'VERIFIED' | 'NOT_ANCHORED' | 'NOT_FULLY_ANCHORED' | 'TAMPERED';

export type BatchVerificationSummary = {
  status: BatchBlockchainStatus;
  badgeLabel: string;
  headline: string;
  description: string;
  consumerDescription: string;
  tamperedStages: string[];
  unanchoredStages: string[];
  verifiedStages: string[];
  totalHandoffs: number;
  verifiedCount: number;
  unanchoredCount: number;
  tamperedCount: number;
  handoffs: VerifiedHandoff[];
  hasTampered: boolean;
  isFullyVerified: boolean;
};

type StoredHandoff = {
  id: string;
  batch_id: string;
  handler_id: string;
  stage: HandoffStage;
  location: string | null;
  notes: string | null;
  created_at: string;
  prev_hash: string | null;
  current_hash: string | null;
  ledger_version: number;
};

/**
 * Verifies a single handoff against its blockchain anchor according to the decision tree:
 * 
 *                  Is hash available on blockchain?
 *                            │
 *                   ┌────────┴────────┐
 *                   NO                YES
 *                   │                  │
 *              NOT ANCHORED       Compare hashes
 *                                        │
 *                                 ┌──────┴──────┐
 *                                 SAME       DIFFERENT
 *                                  │             │
 *                               VERIFIED      TAMPERED
 */
export function verifyHandoffAnchor(
  handoff: HandoffRecord,
  anchor?: HandoffAnchor | null
): HandoffVerificationResult {
  const currentHash = handoff.current_hash?.trim() || null;
  const committedHash = anchor?.committed_hash?.trim() || null;
  const txHash = anchor?.tx_hash?.trim() || null;
  const network = anchor?.network === 'polygon-amoy' || !anchor?.network ? 'Polygon Amoy' : anchor.network;
  const polygonScanUrl = txHash ? polygonExplorerTxUrl(txHash) : null;

  // CASE 1 — NO ANCHOR
  if (!anchor || !committedHash) {
    return {
      status: 'NOT_ANCHORED',
      headline: '⚠ NOT ANCHORED',
      message: 'This handoff does not currently have a blockchain anchor.',
      isAnchored: false,
      isTampered: false,
      isVerified: false,
      recordedHash: currentHash,
      committedHash: null,
      txHash: null,
      network: 'Polygon Amoy',
      polygonScanUrl: null,
    };
  }

  // CASE 2 — ANCHOR EXISTS
  // Only when both hashes exist and are different does status become TAMPERED.
  if (currentHash && committedHash && currentHash !== committedHash) {
    // CASE 2B — HASHES ARE DIFFERENT
    return {
      status: 'TAMPERED',
      headline: '✕ TAMPERED',
      message: 'Recorded data no longer matches the blockchain-anchored proof.',
      isAnchored: true,
      isTampered: true,
      isVerified: false,
      recordedHash: currentHash,
      committedHash: committedHash,
      txHash: txHash,
      network: network,
      polygonScanUrl: polygonScanUrl,
    };
  }

  if (currentHash && committedHash && currentHash === committedHash) {
    // CASE 2A — HASHES ARE THE SAME
    return {
      status: 'VERIFIED',
      headline: '✓ VERIFIED',
      message: 'Recorded hash matches the blockchain-anchored proof.',
      isAnchored: true,
      isTampered: false,
      isVerified: true,
      recordedHash: currentHash,
      committedHash: committedHash,
      txHash: txHash,
      network: network,
      polygonScanUrl: polygonScanUrl,
    };
  }

  // Missing current_hash with an anchor present is unanchored/unverified, not automatically tampered.
  return {
    status: 'NOT_ANCHORED',
    headline: '⚠ NOT ANCHORED',
    message: 'This handoff does not currently have a recorded hash to verify against the anchor.',
    isAnchored: true,
    isTampered: false,
    isVerified: false,
    recordedHash: null,
    committedHash: committedHash,
    txHash: txHash,
    network: network,
    polygonScanUrl: polygonScanUrl,
  };
}

/**
 * Summarizes blockchain verification across all handoffs in a batch.
 */
export function summarizeBatchVerification(
  handoffs: HandoffRecord[],
  anchors: HandoffAnchor[] = []
): BatchVerificationSummary {
  const anchorMap = new Map<string, HandoffAnchor>();
  for (const anchor of anchors) {
    if (anchor.handoff_id) {
      anchorMap.set(anchor.handoff_id, anchor);
    }
  }

  const verifiedHandoffs: VerifiedHandoff[] = handoffs.map((handoff) => {
    const anchor = anchorMap.get(handoff.id) ?? null;
    const verification = verifyHandoffAnchor(handoff, anchor);
    return {
      ...handoff,
      anchor,
      verification,
    };
  });

  const tampered = verifiedHandoffs.filter((h) => h.verification.status === 'TAMPERED');
  const unanchored = verifiedHandoffs.filter((h) => h.verification.status === 'NOT_ANCHORED');
  const verified = verifiedHandoffs.filter((h) => h.verification.status === 'VERIFIED');

  const tamperedStages = tampered.map((h) => h.stage);
  const unanchoredStages = unanchored.map((h) => h.stage);
  const verifiedStages = verified.map((h) => h.stage);

  let status: BatchBlockchainStatus;
  let badgeLabel: string;
  let headline: string;
  let description: string;
  let consumerDescription: string;

  if (tampered.length > 0) {
    status = 'TAMPERED';
    badgeLabel = '✕ TAMPERED';
    headline = '✕ TAMPER EVIDENCE DETECTED';
    description = 'One or more anchored handoffs do not match their blockchain proof.';
    consumerDescription = 'Recorded information does not match the blockchain-anchored proof.';
  } else if (unanchored.length > 0 || verifiedHandoffs.length === 0) {
    if (verified.length === 0) {
      status = 'NOT_ANCHORED';
      badgeLabel = '⚠ NOT ANCHORED';
      headline = '⚠ NOT ANCHORED';
      description = 'This batch does not currently have a blockchain anchor.';
      consumerDescription = 'This handoff has not yet been anchored to the blockchain.';
    } else {
      status = 'NOT_FULLY_ANCHORED';
      badgeLabel = '⚠ NOT FULLY ANCHORED';
      headline = '⚠ NOT FULLY ANCHORED';
      description = 'Some handoffs do not yet have blockchain proof.';
      consumerDescription = 'Some handoffs have not yet been anchored to the blockchain.';
    }
  } else {
    status = 'VERIFIED';
    badgeLabel = '✓ VERIFIED';
    headline = '✓ VERIFIED';
    description = 'All anchored handoffs match their blockchain proofs.';
    consumerDescription = 'Blockchain-anchored proof matches the recorded batch history.';
  }

  return {
    status,
    badgeLabel,
    headline,
    description,
    consumerDescription,
    tamperedStages,
    unanchoredStages,
    verifiedStages,
    totalHandoffs: verifiedHandoffs.length,
    verifiedCount: verified.length,
    unanchoredCount: unanchored.length,
    tamperedCount: tampered.length,
    handoffs: verifiedHandoffs,
    hasTampered: tampered.length > 0,
    isFullyVerified: status === 'VERIFIED',
  };
}

/** Client-side helper to query handoffs and anchors for a batch */
export async function fetchBatchHandoffsWithAnchors(batchId: string, client = supabase) {
  const { data: handoffs, error: handoffsError } = await client
    .from('batch_handoffs')
    .select('id, batch_id, handler_id, stage, location, notes, assigned_distributor_name, assigned_retailer_name, quantity_kg, created_at, prev_hash, current_hash, ledger_version')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  if (handoffsError) throw new Error(handoffsError.message);
  const handoffRows = (handoffs ?? []) as HandoffRecord[];

  if (handoffRows.length === 0) {
    return summarizeBatchVerification([]);
  }

  const handoffIds = handoffRows.map((h) => h.id);
  const { data: anchors, error: anchorsError } = await client
    .from('handoff_blockchain_anchors')
    .select('id, handoff_id, tx_hash, committed_hash, network, created_at')
    .in('handoff_id', handoffIds);

  if (anchorsError) {
    console.warn('Could not fetch blockchain anchors for handoffs:', anchorsError.message);
  }

  return summarizeBatchVerification(handoffRows, (anchors ?? []) as HandoffAnchor[]);
}

/**
 * Simulates a blockchain hash for a supply chain stage.
 * In a real blockchain, this would involve signing and consensus.
 */
/** @deprecated Use recordHandoff. Hashes must be generated by the database RPC. */
export function generateHash(data: object, prevHash = LEDGER_GENESIS_HASH): string {
  return hashHandoff({ batchId: '', actorId: '', stage: '', location: '', notes: JSON.stringify(data), createdAt: '', prevHash });
}

/**
 * Formats a hash for display (shortened)
 */
export function formatHash(hash: string): string {
  if (!hash) return '';
  return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
}

/** Client-side handoffs are anchored through the protected Next.js API route. */
export async function recordBatchOnPolygon(dataHash: string): Promise<string | null> {
  const response = await fetch('/api/blockchain/anchor', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ handoffId: null, dataHash }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error || 'Could not anchor this hash on Polygon.');
  }
  const body = await response.json() as { txHash?: string | null };
  return body.txHash ?? null;
}

export async function getAuthenticatedActor() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Please sign in before recording a supply-chain update.');
  return user;
}

/**
 * The database derives actor, timestamp, previous hash and SHA-256 hash. Clients
 * provide only the business facts needed to append a handoff.
 */
export async function recordHandoff(input: RecordHandoffInput) {
  await getAuthenticatedActor();
  const { data, error } = await supabase.rpc('record_batch_handoff', {
    p_batch_id: input.batchId,
    p_stage: input.stage,
    p_location: input.location ?? null,
    p_notes: input.notes ?? null,
    p_assigned_distributor_name: input.assignedDistributorName ?? null,
    p_assigned_retailer_name: input.assignedRetailerName ?? null,
    p_quantity_kg: input.quantityKg ?? null,
  });
  if (error) throw new Error(error.message);
  const handoff = Array.isArray(data) ? data[0] : data;
  if (handoff?.id && handoff?.current_hash && process.env.NEXT_PUBLIC_POLYGON_ANCHORING !== 'disabled') {
    try {
      const response = await fetch('/api/blockchain/anchor', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ handoffId: handoff.id, dataHash: handoff.current_hash }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || 'Could not anchor the handoff hash on Polygon.');
      }
      const body = await response.json() as { txHash?: string | null };
      if (body.txHash) {
        const { error: anchorError } = await supabase.from('handoff_blockchain_anchors').insert({
          handoff_id: handoff.id,
          tx_hash: body.txHash,
          committed_hash: handoff.current_hash,
          network: 'polygon-amoy',
        });
        if (anchorError) throw new Error(anchorError.message);
      }
    } catch (anchorError) {
      throw anchorError instanceof Error ? anchorError : new Error('Blockchain anchoring failed.');
    }
  }
  return handoff;
}

/** Verify only modern (ledger_version = 1) records; legacy rows remain explicitly unverified. */
export async function verifyBatchLedger(batchId: string) {
  const { count: totalCount, error: countError } = await supabase.from('batch_handoffs').select('*', { count: 'exact', head: true }).eq('batch_id', batchId);
  if (countError) throw new Error(countError.message);
  const { data, error } = await supabase.from('batch_handoffs')
    .select('id, batch_id, handler_id, stage, location, notes, created_at, prev_hash, current_hash, ledger_version')
    .eq('batch_id', batchId).eq('ledger_version', 1).order('created_at', { ascending: true }).order('id', { ascending: true });
  if (error) throw new Error(error.message);
  const entries: LedgerEntry[] = ((data ?? []) as StoredHandoff[]).map((handoff) => ({
    batchId: handoff.batch_id, actorId: handoff.handler_id, stage: handoff.stage,
    location: handoff.location ?? '', notes: handoff.notes ?? '',
    createdAt: new Date(handoff.created_at).toISOString(), prevHash: handoff.prev_hash ?? '', currentHash: handoff.current_hash ?? '',
  }));
  const verification = (await import('@/lib/ledger-core')).verifyLedgerEntries(entries);
  return { ...verification, legacyHandoffCount: Math.max(0, (totalCount ?? 0) - entries.length) };
}

