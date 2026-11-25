import { formatUnits, isAddress } from 'ethers';
import type { WalletNetwork } from './WalletSetupContext';
import { walletNetworks } from './networks';

export interface Erc20TokenBalance {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
  priceUsd: number | null;
  isVerified: boolean;
}

interface BlockscoutTokenBalance {
  token?: {
    address_hash?: unknown;
    decimals?: unknown;
    name?: unknown;
    reputation?: unknown;
    symbol?: unknown;
    type?: unknown;
    exchange_rate?: unknown;
  };
  value?: unknown;
}

export const readTokenBalances = async (
  address: string,
  network: WalletNetwork,
  fetcher: typeof fetch = fetch
): Promise<Erc20TokenBalance[]> => {
  if (!isAddress(address)) {
    throw new Error('Cannot load token balances for an invalid wallet address.');
  }

  const explorerApiUrl = walletNetworks[network].explorerApiUrl;
  if (!explorerApiUrl) {
    throw new Error(`Token balance lookup is not configured for ${walletNetworks[network].label}.`);
  }
  const endpoint = `${explorerApiUrl}/addresses/${address}/token-balances`;
  const response = await fetcher(endpoint, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Token balance provider returned HTTP ${response.status}.`);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Token balance provider returned invalid data.');
  }

  const balances: Erc20TokenBalance[] = [];
  for (const entry of data as BlockscoutTokenBalance[]) {
    if (!entry || typeof entry !== 'object') continue;
    const token = entry.token;
    if (!token || token.type !== 'ERC-20' || typeof entry.value !== 'string' ||
        !/^\d+$/.test(entry.value) || BigInt(entry.value) === BigInt('0')) {
      continue;
    }

    const tokenAddress = token.address_hash;
    const decimals = typeof token.decimals === 'string'
      ? Number(token.decimals)
      : token.decimals;
    if (typeof tokenAddress !== 'string' || !isAddress(tokenAddress) ||
        typeof decimals !== 'number' || !Number.isInteger(decimals) ||
        decimals < 0 || decimals > 255) {
      continue;
    }

    const reputation = typeof token.reputation === 'string'
      ? token.reputation.toLowerCase()
      : '';
    if (reputation === 'scam') continue;

    balances.push({
      address: tokenAddress,
      name: typeof token.name === 'string' && token.name.trim()
        ? token.name.trim()
        : 'Unknown token',
      symbol: typeof token.symbol === 'string' && token.symbol.trim()
        ? token.symbol.trim().slice(0, 20)
        : 'TOKEN',
      decimals,
      balance: formatUnits(BigInt(entry.value), decimals),
      priceUsd: typeof token.exchange_rate === 'string' &&
        Number.isFinite(Number(token.exchange_rate)) && Number(token.exchange_rate) >= 0
        ? Number(token.exchange_rate)
        : null,
      isVerified: reputation === 'verified',
    });
  }

  return balances;
};
