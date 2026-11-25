import { isWalletNetwork, walletNetworkIds, walletNetworks } from './chainRegistry';

test('registry covers the requested major chain families and remains data-driven', () => {
  expect(walletNetworkIds.length).toBeGreaterThanOrEqual(38);
  expect(walletNetworks.ethereum.family).toBe('evm');
  expect(walletNetworks.bitcoin.family).toBe('utxo');
  expect(walletNetworks.cosmos.family).toBe('cosmos');
  expect(walletNetworks.solana.family).toBe('ed25519');

  [
    'polygon',
    'arbitrum',
    'base',
    'optimism',
    'avalanche',
    'cronos',
    'ethereumClassic',
    'mantle',
    'bitcoinCash',
    'zcash',
    'ton',
    'xrp',
    'cardano',
    'polkadot',
    'sui',
    'aptos',
    'near',
    'stellar',
    'internetComputer',
    'linea',
    'scroll',
    'zksync',
    'blast',
    'gnosis',
    'celo',
    'moonbeam',
    'fantom',
  ].forEach((network) => expect(isWalletNetwork(network)).toBe(true));
});
