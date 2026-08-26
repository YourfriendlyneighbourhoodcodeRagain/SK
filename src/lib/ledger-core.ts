import CryptoJS from 'crypto-js';

export const LEDGER_GENESIS_HASH = 'SK_LEDGER_GENESIS_V1';

export type LedgerHashInput = {
  batchId: string;
  actorId: string;
  stage: string;
  location: string;
  notes: string;
  createdAt: string;
  prevHash: string;
};

export type LedgerEntry = LedgerHashInput & { currentHash: string };

function base64(value: string) {
  return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(value));
}

/** A versioned, field-ordered UTF-8 payload shared by ledger writes and verification. */
export function canonicalHandoffPayload(input: LedgerHashInput) {
  return [
    ['batch_id', input.batchId], ['actor_id', input.actorId], ['stage', input.stage],
    ['location', input.location], ['notes', input.notes], ['created_at', input.createdAt], ['prev_hash', input.prevHash],
  ].map(([key, value]) => `${key}=${base64(value)}`).join('|');
}

export function hashHandoff(input: LedgerHashInput) {
  return CryptoJS.SHA256(canonicalHandoffPayload(input)).toString(CryptoJS.enc.Hex);
}

export function verifyLedgerEntries(entries: LedgerEntry[]) {
  let previousHash = LEDGER_GENESIS_HASH;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const previousHashValid = entry.prevHash === previousHash;
    const recordValid = hashHandoff(entry) === entry.currentHash;
    if (!previousHashValid || !recordValid) return { valid: false, handoffCount: entries.length, brokenAt: index, previousHashValid, recordValid };
    previousHash = entry.currentHash;
  }
  return { valid: true, handoffCount: entries.length, brokenAt: null, previousHashValid: true, recordValid: true };
}
