import {
  fetchMarketPrices,
  formatPriceChange,
  formatUsd,
} from './marketPrices';

test('loads the native Ethereum USD price and calculates its 24-hour change', async () => {
  const fetcher = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      error: [],
      result: { XETHZUSD: { c: ['1975', '0.1'], o: '2000' } },
    }),
  });

  await expect(fetchMarketPrices(['ethereum'], fetcher as typeof fetch)).resolves.toEqual({
    ethereum: { usd: 1_975, usd24hChange: -1.25 },
  });
  expect(fetcher).toHaveBeenCalledWith(
    expect.stringContaining('pair=ETHUSD'),
    expect.any(Object)
  );
});

test('rejects unsuccessful or malformed market responses', async () => {
  const unavailable = jest.fn().mockResolvedValue({ ok: false, status: 429 });
  await expect(fetchMarketPrices(['ethereum'], unavailable as typeof fetch)).rejects.toThrow('HTTP 429');

  const malformed = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      error: [],
      result: { XETHZUSD: { c: ['unknown', '0.1'], o: '2000' } },
    }),
  });
  await expect(fetchMarketPrices(['ethereum'], malformed as typeof fetch)).rejects.toThrow('Market price data is invalid for ethereum.');
});

test('loads BNB market quotes for BNB Chain', async () => {
  const fetcher = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      error: [],
      result: { BNBUSD: { c: ['612', '0.1'], o: '600' } },
    }),
  });

  await expect(fetchMarketPrices(['binancecoin'], fetcher as typeof fetch)).resolves.toEqual({
    binancecoin: { usd: 612, usd24hChange: 2 },
  });
  expect(fetcher).toHaveBeenCalledWith(
    expect.stringContaining('pair=BNBUSD'),
    expect.any(Object)
  );
});

test('rejects Kraken API errors and invalid ticker data', async () => {
  const providerError = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ error: ['Unknown asset pair'], result: {} }),
  });
  await expect(fetchMarketPrices(['ethereum'], providerError as typeof fetch)).rejects.toThrow(
    'Market price provider returned an error.'
  );

  const missingPrice = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ error: [], result: { XETHZUSD: { c: ['0', '0.1'], o: '2000' } } }),
  });
  await expect(fetchMarketPrices(['ethereum'], missingPrice as typeof fetch)).rejects.toThrow(
    'Market price data is invalid for ethereum.'
  );
});

test('loads additional coin prices from CoinGecko with 24-hour changes', async () => {
  const fetcher = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      bitcoin: { usd: 98_500, usd_24h_change: 3.25 },
      solana: { usd: 220, usd_24h_change: -1.5 },
    }),
  });

  await expect(fetchMarketPrices(['bitcoin', 'solana'], fetcher as typeof fetch)).resolves.toEqual({
    bitcoin: { usd: 98_500, usd24hChange: 3.25 },
    solana: { usd: 220, usd24hChange: -1.5 },
  });
  expect(fetcher).toHaveBeenCalledWith(
    expect.stringContaining('api.coingecko.com'),
    expect.any(Object)
  );
});

test('formats market prices and negative percentage changes', () => {
  expect(formatUsd(0.45595)).toBe('$0.4560');
  expect(formatPriceChange(-0.5)).toBe('-0.50%');
});
