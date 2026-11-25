import {
  isValidRecipientAddress,
  readNetworkFee,
  validateNativeAmount,
} from './sendSupport';

test.each([
  ['0x9858EfFD232B4033E47d90003D41EC34EcaEda94', 'ethereum', true],
  ['bc1qth572nu57ylma80mshgxy6k9qd23wcs4lnz3tu', 'bitcoin', true],
  ['ltc1qjmxnz78nmc8nq77wuxh25n2es7rzm5c2rkk4wh', 'litecoin', true],
  ['cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4', 'cosmos', true],
  ['0x1234', 'bitcoin', false],
  ['bc1qth572nu57ylma80mshgxy6k9qd23wcs4lnz3tu', 'litecoin', false],
  ['0x1234', 'ethereum', false],
])('validates %s for %s network', (address, network, expected) => {
  expect(isValidRecipientAddress(address, network as Parameters<typeof isValidRecipientAddress>[1]))
    .toBe(expected);
});

test('requires a positive native-asset amount', () => {
  expect(validateNativeAmount('0.5')).toBe(true);
  expect(validateNativeAmount('0')).toBe(false);
  expect(validateNativeAmount('-1')).toBe(false);
  expect(validateNativeAmount('not an amount')).toBe(false);
});

test('uses the live Bitcoin fee-rate provider and reports provider failures', async () => {
  const fetcher = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ fastestFee: 24 }),
  });
  await expect(readNetworkFee('bitcoin', fetcher as typeof fetch)).resolves.toMatchObject({
    network: 'Bitcoin',
    fee: '24 sat/vB recommended fee rate',
  });
  expect(fetcher).toHaveBeenCalledWith(
    'https://mempool.space/api/v1/fees/recommended',
    expect.any(Object)
  );

  await expect(readNetworkFee('bitcoin', jest.fn().mockResolvedValue({
    ok: false,
    status: 503,
  }) as typeof fetch)).rejects.toThrow('Bitcoin fee provider returned HTTP 503.');
});
