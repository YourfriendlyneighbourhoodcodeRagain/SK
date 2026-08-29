import { NextResponse } from 'next/server';
import { verifyBatchIntegrity } from '@/lib/integrity';

/** Public, read-only verification result. No credentials or signing material are returned. */
export async function GET(_request: Request, context: { params: Promise<{ batchId: string }> }) {
  try {
    const { batchId } = await context.params;
    return NextResponse.json(await verifyBatchIntegrity(batchId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Integrity verification is unavailable.' }, { status: 500 });
  }
}
