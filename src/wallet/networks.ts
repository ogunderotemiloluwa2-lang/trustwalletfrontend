import { formatEther, JsonRpcProvider } from 'ethers';
import { walletNetworks } from './chainRegistry';
import type { WalletNetwork } from './chainRegistry';

export { walletNetworks } from './chainRegistry';

export const readNativeBalance = async (
  address: string,
  network: WalletNetwork
): Promise<string> => {
  const config = walletNetworks[network];
  if (config.family === 'evm') {
    if (!config.rpcUrl || !config.chainId) {
      throw new Error(`Native balance lookup is not configured for ${config.label}.`);
    }

    const provider = new JsonRpcProvider(
      config.rpcUrl,
      { chainId: config.chainId, name: network },
      { staticNetwork: true }
    );
    try {
      const balance = await provider.getBalance(address);
      return formatEther(balance);
    } finally {
      await provider.destroy();
    }
  }

  const fetchJson = async (url: string, options?: RequestInit): Promise<Record<string, unknown>> => {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`Balance provider returned HTTP ${response.status}.`);
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Balance provider returned invalid data.');
    }
    return data as Record<string, unknown>;
  };

  if (network === 'bitcoin') {
    const data = await fetchJson(`https://mempool.space/api/address/${encodeURIComponent(address)}`);
    const chainStats = data.chain_stats;
    const mempoolStats = data.mempool_stats;
    if (!chainStats || typeof chainStats !== 'object') throw new Error('Invalid Bitcoin balance data.');
    const chain = chainStats as Record<string, unknown>;
    const mempool = mempoolStats && typeof mempoolStats === 'object'
      ? mempoolStats as Record<string, unknown>
      : {};
    const chainFunded = Number(chain.funded_txo_sum);
    const chainSpent = Number(chain.spent_txo_sum);
    const mempoolFunded = Number(mempool.funded_txo_sum || 0);
    const mempoolSpent = Number(mempool.spent_txo_sum || 0);
    if (![chainFunded, chainSpent, mempoolFunded, mempoolSpent].every(Number.isFinite)) {
      throw new Error('Invalid Bitcoin balance data.');
    }
    return ((chainFunded - chainSpent + mempoolFunded - mempoolSpent) / 100_000_000).toFixed(8);
  }

  if (network === 'litecoin' || network === 'dogecoin' || network === 'bitcoinCash' || network === 'zcash') {
    const chainNames: Partial<Record<WalletNetwork, string>> = {
      litecoin: 'litecoin',
      dogecoin: 'dogecoin',
      bitcoinCash: 'bitcoin-cash',
      zcash: 'zcash',
    };
    const chainName = chainNames[network];
    if (!chainName) throw new Error(`Native balance lookup is not configured for ${config.label}.`);
    const data = await fetchJson(
      `https://api.blockchair.com/${chainName}/dashboards/address/${encodeURIComponent(address)}`
    );
    const dashboard = data.data;
    if (!dashboard || typeof dashboard !== 'object') throw new Error('Invalid UTXO balance data.');
    const account = (dashboard as Record<string, unknown>)[address];
    if (!account || typeof account !== 'object') throw new Error('Invalid UTXO balance data.');
    const record = (account as Record<string, unknown>).address;
    if (!record || typeof record !== 'object') throw new Error('Invalid UTXO balance data.');
    const satoshis = Number((record as Record<string, unknown>).balance);
    if (!Number.isFinite(satoshis)) throw new Error('Invalid UTXO balance data.');
    return (satoshis / 100_000_000).toFixed(8);
  }

  if (network === 'solana') {
    const data = await fetchJson('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] }),
    });
    const result = data.result;
    if (!result || typeof result !== 'object') throw new Error('Invalid Solana balance data.');
    const lamports = Number((result as Record<string, unknown>).value);
    if (!Number.isFinite(lamports)) throw new Error('Invalid Solana balance data.');
    return (lamports / 1_000_000_000).toFixed(9);
  }

  if (network === 'tron') {
    const data = await fetchJson(`https://api.trongrid.io/v1/accounts/${encodeURIComponent(address)}`);
    if (!Array.isArray(data.data)) throw new Error('Invalid TRON balance data.');
    const account = data.data[0];
    if (!account || typeof account !== 'object') throw new Error('Invalid TRON balance data.');
    const sun = Number((account as Record<string, unknown>).balance || 0);
    if (!Number.isFinite(sun)) throw new Error('Invalid TRON balance data.');
    return (sun / 1_000_000).toFixed(6);
  }

  if (network === 'xrp') {
    const data = await fetchJson('https://xrplcluster.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'account_info', params: [{ account: address, ledger_index: 'validated' }] }),
    });
    const result = data.result;
    if (!result || typeof result !== 'object') throw new Error('Invalid XRP balance data.');
    const accountData = (result as Record<string, unknown>).account_data;
    if (!accountData || typeof accountData !== 'object') throw new Error('Invalid XRP balance data.');
    const drops = Number((accountData as Record<string, unknown>).Balance);
    if (!Number.isFinite(drops)) throw new Error('Invalid XRP balance data.');
    return (drops / 1_000_000).toFixed(6);
  }

  if (network === 'cosmos') {
    const data = await fetchJson(`https://cosmos-rest.publicnode.com/cosmos/bank/v1beta1/balances/${encodeURIComponent(address)}`);
    if (!Array.isArray(data.balances)) throw new Error('Invalid Cosmos balance data.');
    const atom = data.balances.find((entry) =>
      entry && typeof entry === 'object' && (entry as Record<string, unknown>).denom === 'uatom'
    ) as Record<string, unknown> | undefined;
    const microAtom = Number(atom?.amount || 0);
    if (!Number.isFinite(microAtom)) throw new Error('Invalid Cosmos balance data.');
    return (microAtom / 1_000_000).toFixed(6);
  }

  if (network === 'stellar') {
    const data = await fetchJson(`https://horizon.stellar.org/accounts/${encodeURIComponent(address)}`);
    if (!Array.isArray(data.balances)) throw new Error('Invalid Stellar balance data.');
    const native = data.balances.find((entry) =>
      entry && typeof entry === 'object' && (entry as Record<string, unknown>).asset_type === 'native'
    ) as Record<string, unknown> | undefined;
    const balance = typeof native?.balance === 'string' ? native.balance : '';
    if (!balance) throw new Error('Invalid Stellar balance data.');
    return balance;
  }

  if (network === 'aptos') {
    const data = await fetchJson(`https://api.mainnet.aptoslabs.com/v1/accounts/${encodeURIComponent(address)}/resource/0x1::coin::CoinStore%3C0x1::aptos_coin::AptosCoin%3E`);
    const resource = data.data;
    if (!resource || typeof resource !== 'object') throw new Error('Invalid Aptos balance data.');
    const coin = (resource as Record<string, unknown>).coin;
    if (!coin || typeof coin !== 'object') throw new Error('Invalid Aptos balance data.');
    const octas = Number((coin as Record<string, unknown>).value);
    if (!Number.isFinite(octas)) throw new Error('Invalid Aptos balance data.');
    return (octas / 100_000_000).toFixed(8);
  }

  if (network === 'sui') {
    const data = await fetchJson('https://fullnode.mainnet.sui.io', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'suix_getBalance',
        params: [address],
      }),
    });
    const result = data.result;
    if (!result || typeof result !== 'object') throw new Error('Invalid Sui balance data.');
    const mist = (result as Record<string, unknown>).totalBalance;
    if (typeof mist !== 'string' || !/^\d+$/.test(mist)) throw new Error('Invalid Sui balance data.');
    const whole = BigInt(mist) / BigInt('1000000000');
    const fraction = (BigInt(mist) % BigInt('1000000000')).toString().padStart(9, '0').slice(0, 6);
    return `${whole}.${fraction}`;
  }

  if (network === 'near') {
    const data = await fetchJson('https://rpc.mainnet.near.org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'balance',
        method: 'query',
        params: { request_type: 'view_account', finality: 'final', account_id: address },
      }),
    });
    const result = data.result;
    if (!result || typeof result !== 'object') throw new Error('Invalid NEAR balance data.');
    const yocto = (result as Record<string, unknown>).amount;
    if (typeof yocto !== 'string' || !/^\d+$/.test(yocto)) throw new Error('Invalid NEAR balance data.');
    const whole = BigInt(yocto) / BigInt('1000000000000000000000000');
    const fraction = (BigInt(yocto) % BigInt('1000000000000000000000000')).toString().padStart(24, '0').slice(0, 6);
    return `${whole}.${fraction}`;
  }

  throw new Error(`Native balance lookup is not configured for ${config.label}.`);
};
