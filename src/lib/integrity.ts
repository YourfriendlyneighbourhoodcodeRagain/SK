import { hashHandoff, verifyLedgerEntries, type LedgerEntry } from '@/lib/ledger-core';
import { supabase } from '@/lib/supabase';

export type IntegrityStatus = 'VERIFIED' | 'WARNING' | 'BROKEN';

type StoredHandoff = {
  id: string; batch_id: string; handler_id: string; stage: string; location: string | null;
  notes: string | null; created_at: string; prev_hash: string | null; current_hash: string | null; ledger_version: number;
};
type StoredAnchor = { handoff_id: string; tx_hash: string | null; committed_hash: string | null; network: string | null };

export type IntegrityHandoff = {
  id: string; stage: string; createdAt: string; status: IntegrityStatus; reason?: string;
  previousHash: string | null; expectedPreviousHash: string | null; currentHash: string | null;
  recalculatedHash: string | null; anchor?: { network: string; transactionHash: string | null; committedHash: string | null };
};
export type BatchIntegrity = {
  status: IntegrityStatus; summary: string; verifiedHandoffs: number; brokenHandoffs: number;
  warningCount: number; handoffs: IntegrityHandoff[];
};

function warning(summary: string, handoffs: IntegrityHandoff[]): BatchIntegrity {
  return { status: 'WARNING', summary, verifiedHandoffs: handoffs.filter((handoff) => handoff.status === 'VERIFIED').length, brokenHandoffs: 0, warningCount: Math.max(1, handoffs.filter((handoff) => handoff.status === 'WARNING').length), handoffs };
}

/**
 * Performs verification from database records only. It deliberately keeps anchors
 * tied to their handoff_id; batch-level anchors are never used as substitutes.
 */
export async function verifyBatchIntegrity(batchId: string): Promise<BatchIntegrity> {
  const { data: rawHandoffs, error: handoffError } = await supabase.from('batch_handoffs')
    .select('id, batch_id, handler_id, stage, location, notes, created_at, prev_hash, current_hash, ledger_version')
    .eq('batch_id', batchId).order('created_at', { ascending: true }).order('id', { ascending: true });
  if (handoffError) throw new Error(handoffError.message);
  const handoffs = (rawHandoffs ?? []) as StoredHandoff[];
  const modern = handoffs.filter((handoff) => handoff.ledger_version === 1);
  if (modern.length === 0) return warning('The batch history is available, but complete external verification is currently unavailable.', handoffs.map((handoff) => ({ id: handoff.id, stage: handoff.stage, createdAt: handoff.created_at, status: 'WARNING', reason: 'This legacy handoff has no versioned ledger proof.', previousHash: handoff.prev_hash, expectedPreviousHash: null, currentHash: handoff.current_hash, recalculatedHash: null })));

  const { data: rawAnchors, error: anchorError } = await supabase.from('handoff_blockchain_anchors')
    .select('handoff_id, tx_hash, committed_hash, network').in('handoff_id', modern.map((handoff) => handoff.id));
  const anchors = new Map<string, StoredAnchor>();
  if (!anchorError) for (const anchor of (rawAnchors ?? []) as StoredAnchor[]) anchors.set(anchor.handoff_id, anchor);

  const entries: LedgerEntry[] = modern.map((handoff) => ({
    batchId: handoff.batch_id, actorId: handoff.handler_id, stage: handoff.stage, location: handoff.location ?? '', notes: handoff.notes ?? '',
    createdAt: new Date(handoff.created_at).toISOString(), prevHash: handoff.prev_hash ?? '', currentHash: handoff.current_hash ?? '',
  }));
  const ledger = verifyLedgerEntries(entries);
  let expectedPreviousHash = 'SK_LEDGER_GENESIS_V1';
  let chainBroken = false;
  const details = modern.map((handoff, index): IntegrityHandoff => {
    const entry = entries[index];
    const recalculatedHash = entry ? hashHandoff(entry) : null;
    const previousValid = entry.prevHash === expectedPreviousHash;
    const hashValid = recalculatedHash === entry.currentHash;
    const anchor = anchors.get(handoff.id);
    const anchorValid = !anchor || anchor.committed_hash === handoff.current_hash;
    const status: IntegrityStatus = !previousValid || !hashValid || !anchorValid ? 'BROKEN' : !anchor || anchorError || !anchor.tx_hash ? 'WARNING' : 'VERIFIED';
    const reason = !previousValid ? 'Previous hash does not match the expected handoff hash.' : !hashValid ? 'Recorded current hash does not match the recalculated hash.' : !anchorValid ? 'Blockchain committed hash does not match the recorded handoff hash.' : !anchor ? 'Anchor not available for this handoff.' : anchorError ? 'Blockchain anchor records are currently unavailable.' : !anchor.tx_hash ? 'Anchor transaction hash is not available.' : undefined;
    expectedPreviousHash = entry.currentHash;
    if (status === 'BROKEN') chainBroken = true;
    return { id: handoff.id, stage: handoff.stage, createdAt: handoff.created_at, status, reason, previousHash: handoff.prev_hash, expectedPreviousHash: index === 0 ? 'SK_LEDGER_GENESIS_V1' : entries[index - 1].currentHash, currentHash: handoff.current_hash, recalculatedHash, anchor: anchor ? { network: anchor.network || 'Polygon Amoy', transactionHash: anchor.tx_hash, committedHash: anchor.committed_hash } : undefined };
  });
  const legacyDetails = handoffs.filter((handoff) => handoff.ledger_version !== 1).map((handoff): IntegrityHandoff => ({ id: handoff.id, stage: handoff.stage, createdAt: handoff.created_at, status: 'WARNING', reason: 'This legacy handoff has no versioned ledger proof.', previousHash: handoff.prev_hash, expectedPreviousHash: null, currentHash: handoff.current_hash, recalculatedHash: null }));
  const resultHandoffs = [...details, ...legacyDetails].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const brokenHandoffs = resultHandoffs.filter((handoff) => handoff.status === 'BROKEN').length;
  if (chainBroken || !ledger.valid) return { status: 'BROKEN', summary: 'The recorded history does not match its cryptographic verification data. Regulatory review is recommended.', verifiedHandoffs: resultHandoffs.filter((handoff) => handoff.status === 'VERIFIED').length, brokenHandoffs, warningCount: resultHandoffs.filter((handoff) => handoff.status === 'WARNING').length, handoffs: resultHandoffs };
  if (resultHandoffs.some((handoff) => handoff.status === 'WARNING')) return warning('The batch history is available, but complete external verification is currently unavailable.', resultHandoffs);
  return { status: 'VERIFIED', summary: 'Supply-chain history and available blockchain proof are consistent.', verifiedHandoffs: resultHandoffs.length, brokenHandoffs: 0, warningCount: 0, handoffs: resultHandoffs };
}
