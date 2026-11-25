import { formatEther, isAddress, JsonRpcProvider, parseEther } from 'ethers';
import type { WalletNetwork } from './chainRegistry';
import { walletNetworks } from './chainRegistry';
import { isValidBech32Address, isValidSegwitAddress } from './walletSetup';

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;
const HEX_ADDRESS = /^0x[0-9a-fA-F]+$/;

export const isValidRecipientAddress = (address: string, network: WalletNetwork): boolean => {
  const candidate = address.trim();
  if (!candidate) return false;
  if (walletNetworks[network].family === 'evm') return isAddress(candidate);

  switch (network) {
    case 'bitcoin':
      return isValidSegwitAddress(candidate, 'bc') || /^[13][1-9A-HJ-NP-Za-km-z]{25,33}$/.test(candidate);
    case 'litecoin':
      return isValidSegwitAddress(candidate, 'ltc') || /^[LM3][1-9A-HJ-NP-Za-km-z]{25,33}$/.test(candidate);
    case 'dogecoin':
      return /^[DA9][1-9A-HJ-NP-Za-km-z]{25,33}$/.test(candidate);
    case 'bitcoinCash':
      return /^bitcoincash:[qp][02-9ac-hj-np-z]{40,}$/i.test(candidate);
    case 'zcash':
      return /^t[13][1-9A-HJ-NP-Za-km-z]{30,35}$/.test(candidate);
    case 'solana':
    case 'polkadot':
      return BASE58.test(candidate) && candidate.length >= (network === 'solana' ? 32 : 47) &&
        candidate.length <= (network === 'solana' ? 44 : 49);
    case 'tron':
      return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(candidate);
    case 'xrp':
      return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(candidate);
    case 'cosmos':
      return isValidBech32Address(candidate, 'cosmos');
    case 'osmosis':
      return isValidBech32Address(candidate, 'osmo');
    case 'cardano':
      return isValidBech32Address(candidate, 'addr') || isValidBech32Address(candidate, 'addr_test');
    case 'stellar':
      return /^G[A-Z2-7]{55}$/.test(candidate);
    case 'aptos':
    case 'sui':
      return HEX_ADDRESS.test(candidate) && candidate.length === 66;
    case 'near':
      return /^[a-f0-9]{64}$/.test(candidate) ||
        /^(?=.{2,64}$)[a-z0-9]+(?:[-_.][a-z0-9]+)*$/.test(candidate);
    case 'ton':
      return /^(?:EQ|UQ)[A-Za-z0-9_-]{46}$/.test(candidate) ||
        /^-?[0-9a-fA-F]{64}$/.test(candidate);
    case 'internetComputer':
      return /^[a-z2-7]+(?:-[a-z2-7]+)*$/.test(candidate);
    default:
      return false;
  }
};

export interface NetworkFeeQuote {
  network: string;
  fee: string;
  updatedAt: number;
}

export const readNetworkFee = async (
  network: WalletNetwork,
  fetcher: typeof fetch = fetch
): Promise<NetworkFeeQuote> => {
  const config = walletNetworks[network];
  if (config.family === 'evm' && config.rpcUrl && config.chainId) {
    const provider = new JsonRpcProvider(
      config.rpcUrl,
      { chainId: config.chainId, name: network },
      { staticNetwork: true }
    );
    try {
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice;
      if (gasPrice === null) throw new Error(`Live fee data is unavailable for ${config.label}.`);
      const estimatedFee = formatEther(gasPrice * BigInt(21_000));
      return {
        network: config.label,
        fee: `~${estimatedFee} ${config.symbol} (21,000 gas native transfer estimate)`,
        updatedAt: Date.now(),
      };
    } finally {
      await provider.destroy();
    }
  }

  if (network === 'bitcoin') {
    const response = await fetcher('https://mempool.space/api/v1/fees/recommended', {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Bitcoin fee provider returned HTTP ${response.status}.`);
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' ||
        typeof (data as Record<string, unknown>).fastestFee !== 'number') {
      throw new Error('Bitcoin fee provider returned invalid data.');
    }
    return {
      network: config.label,
      fee: `${(data as { fastestFee: number }).fastestFee} sat/vB recommended fee rate`,
      updatedAt: Date.now(),
    };
  }

  if (network === 'solana') {
    const response = await fetcher('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getRecentPrioritizationFees', params: [] }),
    });
    if (!response.ok) throw new Error(`Solana fee provider returned HTTP ${response.status}.`);
    const data: unknown = await response.json();
    const result = data && typeof data === 'object'
      ? (data as Record<string, unknown>).result
      : undefined;
    if (!Array.isArray(result)) throw new Error('Solana fee provider returned invalid data.');
    const recentFees = result
      .map((item) => item && typeof item === 'object'
        ? Number((item as Record<string, unknown>).prioritizationFee)
        : NaN)
      .filter((fee) => Number.isFinite(fee) && fee >= 0);
    const priorityFee = recentFees.length ? Math.max(...recentFees) : 0;
    return {
      network: config.label,
      fee: `0.000005 SOL base fee; recent priority fee ${priorityFee} micro-lamports/CU`,
      updatedAt: Date.now(),
    };
  }

  throw new Error(`Live fee estimation is not available for ${config.label}.`);
};

export const validateNativeAmount = (value: string): boolean => {
  try {
    return parseEther(value) > BigInt(0);
  } catch {
    return false;
  }
};
