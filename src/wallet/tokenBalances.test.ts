import { readTokenBalances } from './tokenBalances';

const walletAddress = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94';
const tokenAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

test('discovers positive ERC-20 balances and excludes zero, scam, and non-ERC-20 entries', async () => {
  const fetcher = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => [
      {
        token: {
          address_hash: tokenAddress,
          decimals: '6',
          name: 'USD Coin',
          reputation: 'ok',
          symbol: 'USDC',
          type: 'ERC-20',
          exchange_rate: '1.0',
        },
        value: '12345000',
      },
      {
        token: {
          address_hash: tokenAddress,
          decimals: '6',
          name: 'Zero token',
          symbol: 'ZERO',
          type: 'ERC-20',
        },
        value: '0',
      },
      {
        token: {
          address_hash: tokenAddress,
          decimals: '18',
          name: 'Suspicious token',
          reputation: 'scam',
          symbol: 'SCAM',
          type: 'ERC-20',
        },
        value: '1000000000000000000',
      },
      {
        token: { address_hash: tokenAddress, decimals: '0', symbol: 'NFT', type: 'ERC-721' },
        value: '1',
      },
    ],
  });

  await expect(readTokenBalances(walletAddress, 'ethereum', fetcher as typeof fetch)).resolves.toEqual([
    {
      address: tokenAddress,
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      balance: '12.345',
      priceUsd: 1,
      isVerified: false,
    },
  ]);
});

test('reports indexer failures rather than showing an empty wallet', async () => {
  const unavailable = jest.fn().mockResolvedValue({ ok: false, status: 503 });
  await expect(readTokenBalances(walletAddress, 'ethereum', unavailable as typeof fetch))
    .rejects.toThrow('Token balance provider returned HTTP 503.');
});
