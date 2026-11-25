import { API_BASE_URL } from './authApi';
import { fetchWalletRecords, saveWalletRecord } from './walletApi';

test('saves wallet metadata with the bearer token and parses the record', async () => {
  const fetcher = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      wallet: {
        id: 'wallet-1',
        label: 'My wallet',
        address: '0x1234567890abcdef',
        source: 'created',
        addresses: { ethereum: '0x1234567890abcdef', bitcoin: 'bc1qexample' },
      },
    }),
  });

  await expect(saveWalletRecord('signed-session-token', {
    address: '0x1234567890abcdef',
    addresses: { ethereum: '0x1234567890abcdef', bitcoin: 'bc1qexample' },
  }, fetcher as typeof fetch)).resolves.toEqual({
    id: 'wallet-1',
    label: 'My wallet',
    ownerName: '',
    address: '0x1234567890abcdef',
    source: 'created',
    network: 'ethereum',
    addresses: { ethereum: '0x1234567890abcdef', bitcoin: 'bc1qexample' },
    createdAt: undefined,
    updatedAt: undefined,
  });
  expect(fetcher).toHaveBeenCalledWith(`${API_BASE_URL}/api/wallets`, expect.objectContaining({
    method: 'POST',
    headers: expect.objectContaining({ Authorization: 'Bearer signed-session-token' }),
  }));
});

test('surfaces the backend error message when saving a wallet fails', async () => {
  const fetcher = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ error: 'Authentication required.' }),
  });

  await expect(saveWalletRecord('expired-token', { address: '0xabc' }, fetcher as typeof fetch))
    .rejects.toThrow('Authentication required.');
});

test('lists saved wallets and ignores malformed entries', async () => {
  const fetcher = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      wallets: [
        { id: 'wallet-1', address: '0xabc', label: 'My wallet', source: 'imported', addresses: { bitcoin: 'bc1q' } },
        { id: 'wallet-2', address: '0xdef', addresses: { ethereum: 42 } },
      ],
    }),
  });

  const wallets = await fetchWalletRecords('signed-session-token', fetcher as typeof fetch);
  expect(wallets).toHaveLength(2);
  expect(wallets[0].source).toBe('imported');
  expect(wallets[1].addresses).toEqual({});
});
