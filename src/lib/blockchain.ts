import CryptoJS from 'crypto-js';

/**
 * Simulates a blockchain hash for a supply chain stage.
 * In a real blockchain, this would involve signing and consensus.
 */
export function generateHash(data: object, prevHash: string = '0'): string {
  const dataString = JSON.stringify(data) + prevHash + Date.now().toString();
  return CryptoJS.SHA256(dataString).toString();
}

/**
 * Formats a hash for display (shortened)
 */
export function formatHash(hash: string): string {
  if (!hash) return '';
  return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
}

export async function getAuthenticatedActor() {
  const { supabase } = await import('@/lib/supabase');
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Please sign in before recording a supply-chain update.');
  return user;
}

export async function getPreviousHash(batchId: string): Promise<string> {
  const { supabase } = await import('@/lib/supabase');
  const { data } = await supabase
    .from('handoffs')
    .select('current_hash')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.current_hash ?? '0';
}
