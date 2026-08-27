import { NextResponse } from 'next/server';
import { anchorHashOnPolygon } from '@/lib/polygon';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { handoffId?: string | null; dataHash?: string };
    const dataHash = body.dataHash?.trim();
    if (!dataHash) return NextResponse.json({ error: 'dataHash is required.' }, { status: 400 });

    if (body.handoffId) {
      const { data: handoff, error } = await supabase
        .from('batch_handoffs')
        .select('id, current_hash')
        .eq('id', body.handoffId)
        .maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!handoff) return NextResponse.json({ error: 'Handoff not found.' }, { status: 404 });
      if (handoff.current_hash !== dataHash) {
        return NextResponse.json({ error: 'Hash does not match the immutable handoff record.' }, { status: 400 });
      }
    }

    const txHash = await anchorHashOnPolygon(dataHash);
    return NextResponse.json({ txHash });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Polygon anchoring failed.' }, { status: 500 });
  }
}
