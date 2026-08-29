# Integrity verification demo

Use a non-production Supabase project and a disposable test batch. Do not run this against production data.

1. Open the batch QR trace route and confirm `BLOCKCHAIN INTEGRITY · VERIFIED` (or `INTEGRITY WARNING` when no anchor was recorded).
2. In the Supabase SQL editor, first record the target handoff's `id` and `current_hash` so it can be restored afterwards.
3. Introduce a controlled cryptographic inconsistency for that one test row:

```sql
update public.batch_handoffs
set current_hash = repeat('0', 64)
where id = '<test-handoff-uuid>';
```

4. Refresh the public trace and the regulator console. The affected handoff becomes `Integrity issue`; the batch becomes `VERIFICATION FAILED` and appears in the regulator's integrity-alert filter.
5. Restore the exact original `current_hash` captured in step 2, then refresh again.

The verifier detects this without a special UI switch: it recomputes the canonical ledger payload, validates `prev_hash` continuity, and compares each anchor only to the matching `handoff_id` record.
