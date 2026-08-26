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

/**
 * Integration point for a future Polygon signer. Returning null keeps batch
 * creation fully functional when no blockchain wallet/RPC is configured.
 */
export async function recordBatchOnPolygon(_dataHash: string): Promise<string | null> {
  void _dataHash;
  return null;
}

export async function getAuthenticatedActor() {
  const { supabase } = await import('@/lib/supabaseClient');
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Please sign in before recording a supply-chain update.');
  return user;
}
