import { Wallet } from 'ethers';
import { deriveWalletAddresses, unlockEncryptedWallet, walletFromPhrase } from './walletSetup';

const TEST_PHRASE = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

test('rejects a phrase that is not a valid BIP-39 mnemonic', () => {
  expect(() => walletFromPhrase('not a valid recovery phrase')).toThrow(
    'Enter a valid BIP-39 recovery phrase with a correct checksum.'
  );
});

test('derives the documented address for every supported chain', () => {
  const addresses = deriveWalletAddresses(TEST_PHRASE);

  expect(addresses.ethereum).toBe('0x9858EfFD232B4033E47d90003D41EC34EcaEda94');
  expect(addresses.bnb).toBe(addresses.ethereum);
  expect(addresses.bitcoin).toBe('bc1qth572nu57ylma80mshgxy6k9qd23wcs4lnz3tu');
  expect(addresses.tron).toBe('TUEZSdKsoDHQMeZwihtdoBiN46zxhGWYdH');
  expect(addresses.solana).toBe('HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk');
  expect(addresses.dogecoin).toBe('DBus3bamQjgJULBJtYXpEzDWQRwF5iwxgC');
  expect(addresses.litecoin).toBe('ltc1qjmxnz78nmc8nq77wuxh25n2es7rzm5c2rkk4wh');
  expect(addresses.ripple).toBe('rHsMGQEkVNJmpGWs8XUBoTBiAAbwxZN5v3');
  expect(addresses.cosmos).toBe('cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4');
  expect(addresses.ethereumClassic).toBe('0xFA22515E43658ce56A7682B801e9B5456f511420');
  expect(addresses.bitcoinCash).toBe('bitcoincash:qqyx49mu0kkn9ftfj6hje6g2wfer34yfnq5tahq3q6');
  expect(addresses.zcash).toBe('t1XVXWCvpMgBvUaed4XDqWtgQgJSu1Ghz7F');
  expect(addresses.sui).toBe('0x5e93a736d04fbb25737aa40bee40171ef79f65fae833749e3c089fe7cc2161f1');
  expect(addresses.aptos).toBe('0xeb663b681209e7087d681c5d3eed12aaa8e1915e7c87794542c3f96e94b3d3bf');
  expect(addresses.near).toBe('5510e2b44cae6eb807e3e0e45d579dda058c274abcba15e5cb84636f5d1ee412');
  expect(addresses.stellar).toBe('GB3JDWCQJCWMJ3IILWIGDTQJJC5567PGVEVXSCVPEQOTDN64VJBDQBYX');
  expect(addresses.polkadot).toBe('14E9StbjYhJiAfsNMEcq5tETq79Q6EqaGyebdziY214hNWDH');
});

test('encrypted wallet can only be unlocked with its password', async () => {
  const wallet = new Wallet(`0x${'11'.repeat(32)}`);
  const password = 'a sufficiently long test password';
  const encrypted = await wallet.encrypt(password);

  expect(encrypted).not.toContain(wallet.privateKey);
  await expect(unlockEncryptedWallet(encrypted, 'incorrect password')).rejects.toThrow();
  await expect(unlockEncryptedWallet(encrypted, password)).resolves.toMatchObject({
    address: wallet.address,
  });
});
