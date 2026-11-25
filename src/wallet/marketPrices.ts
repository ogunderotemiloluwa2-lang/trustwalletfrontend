export interface MarketPrice {
  usd: number;
  usd24hChange: number | null;
}

export type MarketCoinId = string;
export type MarketPrices = Partial<Record<MarketCoinId, MarketPrice>>;

export const fetchMarketPrices = async (
  coins: MarketCoinId[] = ['ethereum'],
  fetcher: typeof fetch = fetch
): Promise<MarketPrices> => {
  const uniqueCoins = Array.from(new Set(coins));
  if (uniqueCoins.length === 0) return {};
  const prices: MarketPrices = {};
  const krakenCoins = uniqueCoins.filter((coinId) => coinId === 'ethereum' || coinId === 'binancecoin');
  if (krakenCoins.length > 0) {
    const pairByCoin: Record<string, string> = {
      ethereum: 'ETHUSD',
      binancecoin: 'BNBUSD',
    };
    const url = new URL('https://api.kraken.com/0/public/Ticker');
    url.searchParams.set('pair', krakenCoins.map((coinId) => pairByCoin[coinId]).join(','));

    const response = await fetcher(url.toString(), { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Market price provider returned HTTP ${response.status}.`);
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Market price provider returned invalid data.');
    }
    const record = data as Record<string, unknown>;
    if (!Array.isArray(record.error) || record.error.length > 0) {
      throw new Error('Market price provider returned an error.');
    }
    if (!record.result || typeof record.result !== 'object' || Array.isArray(record.result)) {
      throw new Error('Market price provider returned invalid data.');
    }
    const result = record.result as Record<string, unknown>;
    krakenCoins.forEach((coinId) => {
      const coin = result[pairByCoin[coinId]] ??
        (coinId === 'ethereum' ? result.XETHZUSD : undefined);
      if (!coin || typeof coin !== 'object' || Array.isArray(coin)) {
        throw new Error(`Market price is unavailable for ${coinId}.`);
      }
      const quote = coin as Record<string, unknown>;
      const close = quote.c;
      const open = quote.o;
      const usd = Array.isArray(close) && typeof close[0] === 'string'
        ? Number(close[0])
        : Number.NaN;
      const openPrice = typeof open === 'string' ? Number(open) : Number.NaN;
      if (!Number.isFinite(usd) || usd <= 0 || !Number.isFinite(openPrice) || openPrice <= 0) {
        throw new Error(`Market price data is invalid for ${coinId}.`);
      }
      prices[coinId] = {
        usd,
        usd24hChange: ((usd - openPrice) / openPrice) * 100,
      };
    });
  }

  const coingeckoCoins = uniqueCoins.filter((coinId) => coinId !== 'ethereum' && coinId !== 'binancecoin');
  if (coingeckoCoins.length > 0) {
    const url = new URL('https://api.coingecko.com/api/v3/simple/price');
    url.searchParams.set('ids', coingeckoCoins.join(','));
    url.searchParams.set('vs_currencies', 'usd');
    url.searchParams.set('include_24hr_change', 'true');
    const response = await fetcher(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Market price provider returned HTTP ${response.status}.`);
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Market price provider returned invalid data.');
    }
    const record = data as Record<string, unknown>;
    coingeckoCoins.forEach((coinId) => {
      const coin = record[coinId];
      if (!coin || typeof coin !== 'object' || Array.isArray(coin)) {
        throw new Error(`Market price is unavailable for ${coinId}.`);
      }
      const quote = coin as Record<string, unknown>;
      const usd = Number(quote.usd);
      const change = quote.usd_24h_change;
      if (!Number.isFinite(usd) || usd <= 0) {
        throw new Error(`Market price data is invalid for ${coinId}.`);
      }
      prices[coinId] = {
        usd,
        usd24hChange: typeof change === 'number' && Number.isFinite(change) ? change : null,
      };
    });
  }
  return prices;
};

export const formatUsd = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: amount < 1 ? 4 : 2,
    maximumFractionDigits: amount < 1 ? 4 : 2,
  }).format(amount);

export const formatPriceChange = (change: number): string =>
  `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
