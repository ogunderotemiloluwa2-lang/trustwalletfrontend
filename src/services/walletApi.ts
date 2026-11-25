import { API_BASE_URL } from './authApi';

export interface WalletRecord {
  id: string;
  label: string;
  ownerName: string;
  address: string;
  source: 'created' | 'imported';
  network: string;
  addresses: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveWalletInput {
  address: string;
  label?: string;
  ownerName?: string;
  source?: 'created' | 'imported';
  network?: string;
  addresses?: Record<string, string>;
}

const walletsUrl = (): string => `${API_BASE_URL}/api/wallets`;

const parseWallet = (value: unknown): WalletRecord => {
  if (!value || typeof value !== 'object') {
    throw new Error('Wallet service returned an invalid wallet record.');
  }
  const wallet = value as Record<string, unknown>;
  if (typeof wallet.id !== 'string' || typeof wallet.address !== 'string') {
    throw new Error('Wallet service returned an invalid wallet record.');
  }
  const addresses = wallet.addresses && typeof wallet.addresses === 'object' && !Array.isArray(wallet.addresses)
    ? Object.fromEntries(
      Object.entries(wallet.addresses as Record<string, unknown>)
        .filter(([, address]) => typeof address === 'string')
    ) as Record<string, string>
    : {};
  return {
    id: wallet.id,
    label: typeof wallet.label === 'string' ? wallet.label : 'My wallet',
    ownerName: typeof wallet.ownerName === 'string' ? wallet.ownerName : '',
    address: wallet.address,
    source: wallet.source === 'imported' ? 'imported' : 'created',
    network: typeof wallet.network === 'string' ? wallet.network : 'ethereum',
    addresses,
    createdAt: typeof wallet.createdAt === 'string' ? wallet.createdAt : undefined,
    updatedAt: typeof wallet.updatedAt === 'string' ? wallet.updatedAt : undefined,
  };
};

/**
 * Stores the wallet metadata for the signed-in account so the wallet survives
 * beyond this browser. Only public addresses are sent; the encrypted keystore
 * and recovery phrase stay on the device.
 */
export const saveWalletRecord = async (
  token: string,
  input: SaveWalletInput,
  fetcher: typeof fetch = fetch
): Promise<WalletRecord> => {
  const response = await fetcher(walletsUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  const result: { wallet?: unknown; error?: unknown } = await response.json();
  if (!response.ok) {
    throw new Error(typeof result.error === 'string' ? result.error : 'Could not save the wallet.');
  }
  return parseWallet(result.wallet);
};

export const fetchWalletRecords = async (
  token: string,
  fetcher: typeof fetch = fetch
): Promise<WalletRecord[]> => {
  const response = await fetcher(walletsUrl(), {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  const result: { wallets?: unknown; error?: unknown } = await response.json();
  if (!response.ok) {
    throw new Error(typeof result.error === 'string' ? result.error : 'Could not load wallets.');
  }
  return Array.isArray(result.wallets) ? result.wallets.map(parseWallet) : [];
};
