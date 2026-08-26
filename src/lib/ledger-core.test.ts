import { hashHandoff, LEDGER_GENESIS_HASH, verifyLedgerEntries, type LedgerEntry } from './ledger-core.ts';

function entry(batchId: string, actorId: string, stage: string, createdAt: string, prevHash: string): LedgerEntry {
  const record = { batchId, actorId, stage, location: 'Pune', notes: 'Verified handoff', createdAt, prevHash };
  return { ...record, currentHash: hashHandoff(record) };
}

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

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

console.log('Ledger core tests passed: genesis, chaining, payload tampering, hash tampering, broken links, and independent batches.');
