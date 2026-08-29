import { hashHandoff, LEDGER_GENESIS_HASH, verifyLedgerEntries, type LedgerEntry } from './ledger-core.ts';
import {
  verifyHandoffAnchor,
  summarizeBatchVerification,
  type HandoffRecord,
  type HandoffAnchor,
} from './blockchain.ts';

function entry(batchId: string, actorId: string, stage: string, createdAt: string, prevHash: string): LedgerEntry {
  const record = { batchId, actorId, stage, location: 'Pune', notes: 'Verified handoff', createdAt, prevHash };
  return { ...record, currentHash: hashHandoff(record) };
}

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

// 1. Ledger core cryptographic chain tests
const first = entry('batch-a', 'farmer-a', 'harvest', '2026-08-26T10:00:00.000Z', LEDGER_GENESIS_HASH);
const second = entry('batch-a', 'aggregator-a', 'aggregation', '2026-08-26T10:01:00.000Z', first.currentHash);
const third = entry('batch-a', 'distributor-a', 'logistics', '2026-08-26T10:02:00.000Z', second.currentHash);

expect(verifyLedgerEntries([first]).valid, 'first handoff must use genesis and verify');
expect(verifyLedgerEntries([first, second, third]).valid, 'linked handoffs must verify');
expect(!verifyLedgerEntries([{ ...second, notes: 'changed after signing' }]).valid, 'payload tampering must fail');
expect(!verifyLedgerEntries([{ ...first, currentHash: '0'.repeat(64) }]).valid, 'hash tampering must fail');
expect(!verifyLedgerEntries([{ ...second, prevHash: 'broken-link' }]).previousHashValid, 'broken previous hash must fail');
const otherBatch = entry('batch-b', 'farmer-b', 'harvest', '2026-08-26T10:00:00.000Z', LEDGER_GENESIS_HASH);
expect(verifyLedgerEntries([otherBatch]).valid, 'different batches must have independent chains');

// 2. Blockchain Decision Tree Verification Tests

// TEST 1: Existing correctly anchored handoff (current_hash === committed_hash) -> VERIFIED
const handoffHarvest: HandoffRecord = {
  id: 'h-1',
  batch_id: 'batch-100',
  stage: 'harvest',
  current_hash: first.currentHash,
  created_at: '2026-08-26T10:00:00.000Z',
};

const anchorHarvest: HandoffAnchor = {
  id: 'a-1',
  handoff_id: 'h-1',
  tx_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  committed_hash: first.currentHash,
  network: 'polygon-amoy',
};

const res1 = verifyHandoffAnchor(handoffHarvest, anchorHarvest);
expect(res1.status === 'VERIFIED', 'TEST 1: correctly anchored handoff must be VERIFIED');
expect(res1.isVerified === true, 'isVerified flag must be true');
expect(res1.isTampered === false, 'isTampered flag must be false');
expect(res1.polygonScanUrl?.includes('0x1234567890abcdef'), 'PolygonScan URL must use real tx_hash');

// TEST 2: Handoff without blockchain anchor -> NOT_ANCHORED (Do NOT call this tampering)
const handoffLogistics: HandoffRecord = {
  id: 'h-2',
  batch_id: 'batch-100',
  stage: 'logistics',
  current_hash: third.currentHash,
  created_at: '2026-08-26T10:02:00.000Z',
};

const res2 = verifyHandoffAnchor(handoffLogistics, null);
expect(res2.status === 'NOT_ANCHORED', 'TEST 2: missing anchor must produce NOT_ANCHORED');
expect(res2.isTampered === false, 'Missing anchor must NOT be marked as tampered');
expect(res2.isVerified === false, 'Missing anchor is not verified');

// TEST 3: Controlled mismatch between current_hash and committed_hash -> TAMPERED
const anchorLogisticsMismatched: HandoffAnchor = {
  id: 'a-2',
  handoff_id: 'h-2',
  tx_hash: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  committed_hash: '1111111111111111111111111111111111111111111111111111111111111111',
  network: 'polygon-amoy',
};

const res3 = verifyHandoffAnchor(handoffLogistics, anchorLogisticsMismatched);
expect(res3.status === 'TAMPERED', 'TEST 3: mismatched hashes must produce TAMPERED');
expect(res3.isTampered === true, 'isTampered must be true');
expect(res3.recordedHash === third.currentHash, 'recordedHash must match handoff current_hash');
expect(res3.committedHash === '1111111111111111111111111111111111111111111111111111111111111111', 'committedHash must match anchor');

// TEST 4: Missing current_hash with an anchor present -> NOT_ANCHORED (not TAMPERED)
const handoffMissingHash: HandoffRecord = {
  id: 'h-3',
  stage: 'retail',
  current_hash: null,
  created_at: '2026-08-26T10:03:00.000Z',
};
const res4 = verifyHandoffAnchor(handoffMissingHash, anchorHarvest);
expect(res4.status === 'NOT_ANCHORED', 'Missing current_hash must not be marked as TAMPERED');

// TEST 5: Batch-level summary with multiple handoffs
// Case 5A: All verified
const batchAllVerified = summarizeBatchVerification(
  [handoffHarvest],
  [anchorHarvest]
);
expect(batchAllVerified.status === 'VERIFIED', 'All anchored and matching handoffs must produce batch VERIFIED');

// Case 5B: Mixed verified and unanchored (Harvest VERIFIED, Logistics NOT ANCHORED)
const batchPartial = summarizeBatchVerification(
  [handoffHarvest, handoffLogistics],
  [anchorHarvest]
);
expect(batchPartial.status === 'NOT_FULLY_ANCHORED', 'Batch with some unanchored must be NOT_FULLY_ANCHORED');
expect(batchPartial.hasTampered === false, 'Partial anchors must NOT mark batch as TAMPERED');

// Case 5C: One stage tampered (Harvest VERIFIED, Logistics TAMPERED)
const batchTampered = summarizeBatchVerification(
  [handoffHarvest, handoffLogistics],
  [anchorHarvest, anchorLogisticsMismatched]
);
expect(batchTampered.status === 'TAMPERED', 'Batch with one tampered handoff must produce batch TAMPERED');
expect(batchTampered.tamperedStages.includes('logistics'), 'Tampered stage must be identified as logistics');
expect(!batchTampered.tamperedStages.includes('harvest'), 'Harvest must remain verified');

console.log('All tests passed: cryptographic ledger core, decision-tree anchor verification (VERIFIED, NOT_ANCHORED, TAMPERED), and multi-stage batch summarization.');

