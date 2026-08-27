import { ethers } from 'ethers';

type PolygonConfig = {
  rpcUrl: string;
  privateKey: string;
};

function getPolygonConfig(): PolygonConfig {
  const rpcUrl = process.env.POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology';
  const privateKey = process.env.POLYGON_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Polygon anchoring is not configured. Add POLYGON_PRIVATE_KEY to .env.local.');
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error('POLYGON_PRIVATE_KEY must be a 32-byte hex private key beginning with 0x.');
  }
  return { rpcUrl, privateKey };
}

function normalizeHash(dataHash: string): string {
  const clean = dataHash.trim().replace(/^0x/i, '');
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    throw new Error('Only a 32-byte SHA-256 hash can be anchored on Polygon.');
  }
  return `0x${clean}`;
}

/**
 * Writes an immutable 32-byte hash commitment to Polygon Amoy.
 * The relayer wallet sends a zero-value self-transaction whose calldata is
 * exactly the SHA-256 commitment. No application data or PII is written on-chain.
 */
export async function anchorHashOnPolygon(dataHash: string): Promise<string> {
  const { rpcUrl, privateKey } = getPolygonConfig();
  const hash = normalizeHash(dataHash);
  const provider = new ethers.JsonRpcProvider(rpcUrl, 80002, { staticNetwork: true });
  const wallet = new ethers.Wallet(privateKey, provider);
  const network = await provider.getNetwork();
  if (network.chainId !== 80002n) {
    throw new Error(`Unexpected Polygon network. Expected chain 80002, got ${network.chainId}.`);
  }

  const tx = await wallet.sendTransaction({
    to: wallet.address,
    value: 0n,
    data: hash,
  });
  await tx.wait();
  return tx.hash;
}

export function polygonExplorerTxUrl(txHash: string): string {
  return `https://amoy.polygonscan.com/tx/${txHash}`;
}
