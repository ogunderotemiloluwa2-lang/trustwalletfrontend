import {
  getBytes,
  HDNodeWallet,

  keccak256,
  Mnemonic,
  ripemd160,
  sha256,
  SigningKey,
  Wallet,
} from 'ethers';
import { ed25519 } from '@noble/curves/ed25519';
import { hmac } from '@noble/hashes/hmac';
import { sha512 } from '@noble/hashes/sha512';
import { blake2b } from '@noble/hashes/blake2b';
import { sha3_256 } from '@noble/hashes/sha3';
import { sha224 } from '@noble/hashes/sha256';
import { pbkdf2 } from '@noble/hashes/pbkdf2';

export interface WalletAddresses {
  ethereum: string;
  bnb: string;
  bitcoin: string;
  tron: string;
  solana: string;
  dogecoin: string;
  litecoin: string;
  ripple: string;
  cosmos: string;
  ethereumClassic?: string;
  bitcoinCash?: string;
  zcash?: string;
  sui?: string;
  aptos?: string;
  near?: string;
  stellar?: string;
  polkadot?: string;
  ton?: string;
  cardano?: string;
  internetComputer?: string;
  osmosis?: string;
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const XRP_ALPHABET = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz';
const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const CASHADDR_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

/**
 * Bitcoin address presented by this preview wallet. The send flow never
 * broadcasts a transaction, so Receive, balance lookup, and copy actions all
 * agree on this single, valid Native SegWit address.
 */
export const DEMO_BITCOIN_ADDRESS = 'bc1qth572nu57ylma80mshgxy6k9qd23wcs4lnz3tu';

export interface WalletSetupResult {
  address: string;
  addresses: WalletAddresses;
  mnemonic: string;
  wallet: Wallet;
}

const normalizePhrase = (input: string): string => input.trim().toLowerCase().split(/\s+/).join(' ');

const convertBits = (data: number[], from: number, to: number, pad: boolean): number[] => {
  let accumulator = 0;
  let bits = 0;
  const result: number[] = [];
  const maxValue = (1 << to) - 1;
  for (const value of data) {
    if (value < 0 || value >>> from !== 0) throw new Error('Invalid address key data.');
    accumulator = (accumulator << from) | value;
    bits += from;
    while (bits >= to) {
      bits -= to;
      result.push((accumulator >>> bits) & maxValue);
    }
  }
  if (pad) {
    if (bits > 0) result.push((accumulator << (to - bits)) & maxValue);
  } else if (bits >= from || ((accumulator << (to - bits)) & maxValue) !== 0) {
    throw new Error('Invalid address encoding.');
  }
  return result;
};

const bech32Polymod = (values: number[]): number => {
  const generators = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let checksum = 1;
  values.forEach((value) => {
    const top = checksum >>> 25;
    checksum = ((checksum & 0x1ffffff) << 5) ^ value;
    generators.forEach((generator, index) => {
      if ((top >>> index) & 1) checksum ^= generator;
    });
  });
  return checksum >>> 0;
};

interface Bech32Decoded {
  hrp: string;
  data: number[];
  encoding: 'bech32' | 'bech32m';
}

const BECH32M_CONST = 0x2bc830a3;

const bech32Decode = (address: string): Bech32Decoded | null => {
  if (typeof address !== 'string') return null;
  if (address.length < 8 || address.length > 90) return null;
  if (address !== address.toLowerCase() && address !== address.toUpperCase()) return null;
  const normalized = address.toLowerCase();
  const separatorIndex = normalized.lastIndexOf('1');
  if (separatorIndex < 1 || separatorIndex + 7 > normalized.length) return null;
  const hrp = normalized.slice(0, separatorIndex);
  const data: number[] = [];
  for (const character of normalized.slice(separatorIndex + 1)) {
    const value = BECH32_CHARSET.indexOf(character);
    if (value === -1) return null;
    data.push(value);
  }
  const expandedHrp = [
    ...Array.from(hrp, (character) => character.charCodeAt(0) >>> 5),
    0,
    ...Array.from(hrp, (character) => character.charCodeAt(0) & 31),
  ];
  const polymod = bech32Polymod([...expandedHrp, ...data]);
  if (polymod === 1) return { hrp, data: data.slice(0, -6), encoding: 'bech32' };
  if (polymod === BECH32M_CONST) return { hrp, data: data.slice(0, -6), encoding: 'bech32m' };
  return null;
};

/** Validates any bech32/bech32m address, optionally constrained to one human-readable prefix. */
export const isValidBech32Address = (address: string, expectedHrp?: string): boolean => {
  const decoded = bech32Decode(address);
  if (!decoded || decoded.data.length === 0) return false;
  return expectedHrp ? decoded.hrp === expectedHrp : true;
};

/** Validates a SegWit address (Bitcoin `bc1…`, Litecoin `ltc1…`) including witness version rules. */
export const isValidSegwitAddress = (address: string, expectedHrp = 'bc'): boolean => {
  const decoded = bech32Decode(address);
  if (!decoded || decoded.hrp !== expectedHrp) return false;
  const [version, ...program] = decoded.data;
  if (version === undefined || version > 16) return false;
  if (program.length < 2 || program.length > 40) return false;
  if (version === 0) {
    if (decoded.encoding !== 'bech32') return false;
    return program.length === 20 || program.length === 32;
  }
  return decoded.encoding === 'bech32m';
};

const bech32Encode = (hrp: string, data: number[]): string => {
  const expandedHrp = [
    ...Array.from(hrp, (character) => character.charCodeAt(0) >>> 5),
    0,
    ...Array.from(hrp, (character) => character.charCodeAt(0) & 31),
  ];
  const polymod = bech32Polymod([...expandedHrp, ...data, 0, 0, 0, 0, 0, 0]) ^ 1;
  const checksum = Array.from({ length: 6 }, (_, index) =>
    (polymod >>> (5 * (5 - index))) & 31
  );
  return `${hrp}1${[...data, ...checksum].map((value) => BECH32_CHARSET[value]).join('')}`;
};

/** Encodes an 8-bit payload as bech32, regrouping it into 5-bit words first. */
const encodeBech32 = (hrp: string, payload: number[]): string =>
  bech32Encode(hrp, convertBits(payload, 8, 5, true));

const encodeSegwitAddress = (publicKey: string, hrp: string): string => {
  const publicKeyBytes = getBytes(publicKey);
  const witnessProgram = getBytes(ripemd160(getBytes(sha256(publicKeyBytes))));
  // The witness version is a 5-bit value, so it is prepended after the program
  // has been regrouped into 5-bit words rather than being converted with it.
  return bech32Encode(hrp, [0, ...convertBits(Array.from(witnessProgram), 8, 5, true)]);
};

const encodeBase58 = (bytes: Uint8Array, alphabet = BASE58_ALPHABET): string => {
  const digits: number[] = [];
  for (let byteIndex = 0; byteIndex < bytes.length; byteIndex += 1) {
    let carry = bytes[byteIndex];
    for (let index = 0; index < digits.length; index += 1) {
      carry += digits[index] << 8;
      digits[index] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let leadingZeroes = 0;
  while (leadingZeroes < bytes.length && bytes[leadingZeroes] === 0) leadingZeroes += 1;
  const encoded = digits.reverse().map((digit) => alphabet[digit]).join('');
  return `${alphabet[0].repeat(leadingZeroes)}${encoded}`;
};

const hash160 = (bytes: Uint8Array): Uint8Array =>
  getBytes(ripemd160(getBytes(sha256(bytes))));

const encodeBase58Check = (payload: Uint8Array, alphabet = BASE58_ALPHABET): string => {
  const checksum = getBytes(sha256(getBytes(sha256(payload)))).slice(0, 4);
  return encodeBase58(new Uint8Array([...Array.from(payload), ...Array.from(checksum)]), alphabet);
};

const encodeBase32 = (bytes: Uint8Array): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let accumulator = 0;
  let bits = 0;
  let encoded = '';
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index];
    accumulator = (accumulator << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      encoded += alphabet[(accumulator >>> bits) & 31];
    }
  }
  if (bits > 0) encoded += alphabet[(accumulator << (5 - bits)) & 31];
  return encoded;
};

const encodeStellarAddress = (publicKey: Uint8Array): string => {
  const payload = new Uint8Array([48, ...Array.from(publicKey)]);
  let crc = 0;
  payload.forEach((byte) => {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  });
  const checksum = new Uint8Array([crc & 0xff, (crc >>> 8) & 0xff]);
  return encodeBase32(new Uint8Array([...Array.from(payload), ...Array.from(checksum)]));
};

const cashAddrPolymod = (values: number[]): bigint => {
  const generators = [
    BigInt('0x98f2bc8e61'),
    BigInt('0x79b76d99e2'),
    BigInt('0xf33e5fb3c4'),
    BigInt('0xae2eabe2a8'),
    BigInt('0x1e4f43e470'),
  ];
  let checksum = BigInt(1);
  for (const value of values) {
    const top = checksum >> BigInt(35);
    checksum = ((checksum & BigInt('0x07ffffffff')) << BigInt(5)) ^ BigInt(value);
    for (let index = 0; index < generators.length; index += 1) {
      if (((top >> BigInt(index)) & BigInt(1)) !== BigInt(0)) checksum ^= generators[index];
    }
  }
  return checksum ^ BigInt(1);
};

const encodeBitcoinCashAddress = (publicKey: string): string => {
  const payload = convertBits(
    [0, ...Array.from(hash160(getBytes(publicKey)))],
    8,
    5,
    true
  );
  const prefixData = [...Array.from('bitcoincash', (character) => character.charCodeAt(0) & 31), 0];
  const checksum = cashAddrPolymod([...prefixData, ...payload, 0, 0, 0, 0, 0, 0, 0, 0]);
  const checksumValues = Array.from({ length: 8 }, (_, index) =>
    Number((checksum >> BigInt(5 * (7 - index))) & BigInt(31))
  );
  return `bitcoincash:${[...payload, ...checksumValues]
    .map((value) => CASHADDR_CHARSET[value])
    .join('')}`;
};

/** ASCII-only encoder that avoids TextEncoder, which is absent in some test runtimes. */
const asciiBytes = (value: string): Uint8Array => {
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i += 1) {
    bytes[i] = value.charCodeAt(i) & 0xff;
  }
  return bytes;
};

const hex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const fromHex = (value: string): Uint8Array => {
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(value.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

/** CRC-32 (IEEE 802.3), used by the Internet Computer principal checksum. */
const crc32 = (bytes: Uint8Array): number => {
  let crc = 0xffffffff;
  bytes.forEach((byte) => {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  });
  return (crc ^ 0xffffffff) >>> 0;
};

/** CRC-16/XMODEM, used by the Cardano bech32 payload. */
const crc16 = (bytes: Uint8Array): number => {
  let crc = 0;
  bytes.forEach((byte) => {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  });
  return crc;
};

/**
 * Cardano CIP-19 enterprise (type 6) address: header byte 0x61 followed by the
 * 28-byte blake2b-224 payment credential, wrapped in a bech32 `addr` payload.
 */
const encodeCardanoAddress = (publicKey: Uint8Array): string => {
  const credential = blake2b(publicKey, { dkLen: 28 });
  return encodeBech32('addr', [0x61, ...Array.from(credential)]);
};

/**
 * TON v4R2 wallet address. The state init is a cell holding the wallet code and
 * data cells; its hash is rendered as a bounceable, URL-safe base64 address.
 */
const TON_V4R2_CODE_HASH = 'feb5ff6820e2ff0d9483e7e0d62c817d846789fb4ae580c878866d959dabd5c0';
const TON_V4R2_CODE_DEPTH = 7;

/** Serialises a cell as `[refsDescriptor, bitsDescriptor, bits, ...depths, ...hashes]`. */
const tonCellRepr = (
  refsDescriptor: number,
  bitLength: number,
  bits: Uint8Array,
  childDepths: number[],
  childHashes: Uint8Array[],
): Uint8Array => {
  const byteLength = Math.ceil(bitLength / 8);
  const padded = new Uint8Array(byteLength);
  // Cell bits are stored most-significant first.
  for (let index = 0; index < bitLength; index += 1) {
    if ((bits[index >> 3] >> (7 - (index & 7))) & 1) {
      padded[index >> 3] |= 1 << (7 - (index & 7));
    }
  }
  // Any unused trailing bits are padded with a single 1 followed by zeroes.
  if (bitLength % 8 !== 0) padded[byteLength - 1] |= 1 << (7 - (bitLength % 8));
  const depthBytes = childDepths.flatMap((depth) => [(depth >> 8) & 0xff, depth & 0xff]);
  return new Uint8Array([
    refsDescriptor,
    Math.ceil(bitLength / 8) + Math.floor(bitLength / 8),
    ...Array.from(padded),
    ...depthBytes,
    ...childHashes.flatMap((hash) => Array.from(hash)),
  ]);
};

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Encodes bytes as standard base64 without relying on Node's `Buffer`. */
const encodeBase64 = (bytes: Uint8Array): string => {
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const byte1 = bytes[index];
    const byte2: number | undefined = bytes[index + 1];
    const byte3: number | undefined = bytes[index + 2];
    output += BASE64_ALPHABET[byte1 >> 2];
    output += BASE64_ALPHABET[((byte1 & 0x03) << 4) | ((byte2 ?? 0) >> 4)];
    output += byte2 === undefined ? '=' : BASE64_ALPHABET[((byte2 & 0x0f) << 2) | ((byte3 ?? 0) >> 6)];
    output += byte3 === undefined ? '=' : BASE64_ALPHABET[byte3 & 0x3f];
  }
  return output;
};

const encodeTonAddress = (publicKey: Uint8Array): string => {
  const workchain = 0;
  const walletId = 698983191 + workchain;
  // 32-bit seqno, 32-bit wallet id, 256-bit public key and the single zero bit
  // that terminates the empty plugins dictionary.
  const dataBits = new Uint8Array(41);
  dataBits[4] = (walletId >>> 24) & 0xff;
  dataBits[5] = (walletId >>> 16) & 0xff;
  dataBits[6] = (walletId >>> 8) & 0xff;
  dataBits[7] = walletId & 0xff;
  dataBits.set(publicKey, 8);
  const dataHash = getBytes(sha256(tonCellRepr(0, 321, dataBits, [], [])));

  const stateInitHash = getBytes(
    sha256(
      tonCellRepr(
        2,
        5,
        new Uint8Array([0x34]),
        [TON_V4R2_CODE_DEPTH, 0],
        [fromHex(TON_V4R2_CODE_HASH), dataHash],
      ),
    ),
  );

  const payload = new Uint8Array([0x11, workchain, ...Array.from(stateInitHash)]);
  const checksum = crc16(payload);
  return encodeBase64(
    new Uint8Array([...Array.from(payload), (checksum >> 8) & 0xff, checksum & 0xff]),
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

/**
 * Internet Computer principal: sha224 of the raw Ed25519 public key with the
 * self-authenticating suffix `0x02` appended, prefixed by its big-endian CRC-32
 * checksum and rendered as lowercase, dash-grouped base32.
 */
const encodeInternetComputerAddress = (publicKey: Uint8Array): string => {
  const digest = getBytes(sha224(publicKey));
  const principal = new Uint8Array([...Array.from(digest), 0x02]);
  const checksum = crc32(principal);
  const withChecksum = new Uint8Array([
    (checksum >>> 24) & 0xff,
    (checksum >>> 16) & 0xff,
    (checksum >>> 8) & 0xff,
    checksum & 0xff,
    ...Array.from(principal),
  ]);
  const base32 = encodeBase32(withChecksum).toLowerCase();
  return base32.replace(/(.{5})(?=.)/g, '$1-');
};

/** SLIP-0010 hardened-only derivation used by ed25519 chains such as Solana. */
export const deriveSlip10Ed25519 = (seed: Uint8Array, path: number[]): Uint8Array => {
  let digest = hmac(sha512, asciiBytes('ed25519 seed'), seed);
  let key = digest.slice(0, 32);
  let chainCode = digest.slice(32);
  for (const segment of path) {
    const data = new Uint8Array(37);
    data[0] = 0;
    data.set(key, 1);
    const index = segment + 0x80000000;
    data[33] = (index >>> 24) & 0xff;
    data[34] = (index >>> 16) & 0xff;
    data[35] = (index >>> 8) & 0xff;
    data[36] = index & 0xff;
    digest = hmac(sha512, chainCode, data);
    key = digest.slice(0, 32);
    chainCode = digest.slice(32);
  }
  return key;
};

/**
 * Cardano uses BIP32-Ed25519 (CIP-3), which — unlike SLIP-0010 — supports
 * non-hardened derivation. The extended private key is 64 bytes: the clamped
 * scalar `kL` followed by the 32-byte extension `kR`.
 */
/**
 * Icarus master key (CIP-3). Cardano's reference implementation calls
 * `pbkdf2(mac, salt, iterations, out)` with the *password* as the HMAC key and
 * the BIP-39 entropy as the salt, so the effective call is
 * `PBKDF2-HMAC-SHA512(password=passphrase, salt=entropy, c=4096, dkLen=96)`.
 * The first 64 bytes are the extended key (`kL` clamped, `kR`), the last 32 the
 * chain code.
 */
const cardanoRootKey = (entropy: Uint8Array): { key: Uint8Array; chainCode: Uint8Array } => {
  const digest = getBytes(pbkdf2(sha512, new Uint8Array(0), entropy, { c: 4096, dkLen: 96 }));
  const key = digest.slice(0, 64);
  key[0] &= 0b1111_1000;
  key[31] &= 0b0001_1111;
  key[31] |= 0b0100_0000;
  return { key, chainCode: digest.slice(64) };
};

/** Little-endian byte order, as used by the BIP32-Ed25519 scalar arithmetic. */
const bytesToBigIntLE = (bytes: Uint8Array): bigint => {
  let value = BigInt(0);
  for (let index = bytes.length - 1; index >= 0; index -= 1) {
    value = (value << BigInt(8)) | BigInt(bytes[index]);
  }
  return value;
};

const bigIntToBytesLE = (value: bigint, length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  let remaining = value;
  for (let index = 0; index < length; index += 1) {
    bytes[index] = Number(remaining & BigInt(0xff));
    remaining >>= BigInt(8);
  }
  return bytes;
};

/**
 * BIP32-Ed25519 public key: the base point multiplied by the clamped scalar
 * `kL`. This is *not* `ed25519.getPublicKey(kL)`, which would hash the scalar
 * again as if it were a seed.
 */
const cardanoPublicKeyFromScalar = (scalar: Uint8Array): Uint8Array =>
  ed25519.ExtendedPoint.BASE.multiplyUnsafe(
    bytesToBigIntLE(scalar) % ed25519.CURVE.n
  ).toRawBytes();

/**
 * BIP32-Ed25519 child derivation (the `V2` scheme used by Cardano). Hardened
 * children commit to the full extended private key, soft children to the
 * 32-byte public key; the chain code comes from a second HMAC with a different
 * tag. `kL` is advanced by `8 * trunc28(zL)` and `kR` by `zR`, both modulo
 * 2^256.
 */
const cardanoDeriveChild = (
  parent: { key: Uint8Array; chainCode: Uint8Array },
  index: number,
): { key: Uint8Array; chainCode: Uint8Array } => {
  const hardened = index >= 0x80000000;
  const indexBytes = new Uint8Array([
    index & 0xff,
    (index >>> 8) & 0xff,
    (index >>> 16) & 0xff,
    (index >>> 24) & 0xff,
  ]);
  const publicKey = cardanoPublicKeyFromScalar(parent.key.slice(0, 32));
  const zData = new Uint8Array(hardened ? 1 + 64 + 4 : 1 + 32 + 4);
  const iData = new Uint8Array(zData.length);
  if (hardened) {
    zData[0] = 0x00;
    iData[0] = 0x01;
    zData.set(parent.key, 1);
    iData.set(parent.key, 1);
  } else {
    zData[0] = 0x02;
    iData[0] = 0x03;
    zData.set(publicKey, 1);
    iData.set(publicKey, 1);
  }
  zData.set(indexBytes, zData.length - 4);
  iData.set(indexBytes, iData.length - 4);

  const z = getBytes(hmac(sha512, parent.chainCode, zData));
  const i = getBytes(hmac(sha512, parent.chainCode, iData));

  const modulus = BigInt(1) << BigInt(256);
  const childKl = (bytesToBigIntLE(parent.key.slice(0, 32)) + BigInt(8) * bytesToBigIntLE(z.slice(0, 28))) % modulus;
  const childKr = (bytesToBigIntLE(parent.key.slice(32, 64)) + bytesToBigIntLE(z.slice(32, 64))) % modulus;

  const key = new Uint8Array(64);
  key.set(bigIntToBytesLE(childKl, 32), 0);
  key.set(bigIntToBytesLE(childKr, 32), 32);
  return { key, chainCode: i.slice(32, 64) };
};

/** Derives the CIP-1852 payment public key for `m/1852'/1815'/0'/0/0`. */
const deriveCardanoPublicKey = (entropy: Uint8Array): Uint8Array => {
  let node = cardanoRootKey(entropy);
  // Account level is hardened; the address-index levels are not.
  for (const index of [1852, 1815, 0]) {
    node = cardanoDeriveChild(node, index + 0x80000000);
  }
  for (const index of [0, 0]) {
    node = cardanoDeriveChild(node, index);
  }
  return cardanoPublicKeyFromScalar(node.key.slice(0, 32));
};

const deriveTronAddress = (privateKey: string): string => {
  const uncompressedPublicKey = getBytes(SigningKey.computePublicKey(privateKey, false)).slice(1);
  const addressPayload = new Uint8Array([
    0x41,
    ...Array.from(getBytes(keccak256(uncompressedPublicKey)).slice(-20)),
  ]);
  const checksum = getBytes(sha256(getBytes(sha256(addressPayload)))).slice(0, 4);
  return encodeBase58(new Uint8Array([...Array.from(addressPayload), ...Array.from(checksum)]));
};

export const deriveWalletAddresses = (input: string): WalletAddresses => {
  const phrase = normalizePhrase(input);
  if (!Mnemonic.isValidMnemonic(phrase)) {
    throw new Error('Enter a valid BIP-39 recovery phrase with a correct checksum.');
  }
  const ethereumWallet = Wallet.fromPhrase(phrase);
  const tronWallet = HDNodeWallet.fromPhrase(phrase, undefined, "m/44'/195'/0'/0/0");
  const dogecoinWallet = HDNodeWallet.fromPhrase(phrase, undefined, "m/44'/3'/0'/0/0");
  const litecoinWallet = HDNodeWallet.fromPhrase(phrase, undefined, "m/84'/2'/0'/0/0");
  const rippleWallet = HDNodeWallet.fromPhrase(phrase, undefined, "m/44'/144'/0'/0/0");
  const cosmosWallet = HDNodeWallet.fromPhrase(phrase, undefined, "m/44'/118'/0'/0/0");
  const ethereumClassicWallet = HDNodeWallet.fromPhrase(phrase, undefined, "m/44'/61'/0'/0/0");
  const bitcoinCashWallet = HDNodeWallet.fromPhrase(phrase, undefined, "m/44'/145'/0'/0/0");
  const zcashWallet = HDNodeWallet.fromPhrase(phrase, undefined, "m/44'/133'/0'/0/0");
  const seed = getBytes(Mnemonic.fromPhrase(phrase).computeSeed());
  const solanaPublicKey = ed25519.getPublicKey(deriveSlip10Ed25519(seed, [44, 501, 0, 0]));
  const suiPublicKey = ed25519.getPublicKey(deriveSlip10Ed25519(seed, [44, 784, 0, 0, 0]));
  const aptosPublicKey = ed25519.getPublicKey(deriveSlip10Ed25519(seed, [44, 637, 0, 0, 0]));
  const nearPublicKey = ed25519.getPublicKey(deriveSlip10Ed25519(seed, [44, 397, 0]));
  const stellarPublicKey = ed25519.getPublicKey(deriveSlip10Ed25519(seed, [44, 148, 0]));
  const polkadotPublicKey = ed25519.getPublicKey(deriveSlip10Ed25519(seed, [44, 354, 0, 0, 0]));
  const tonPublicKey = ed25519.getPublicKey(deriveSlip10Ed25519(seed, [44, 607, 0]));
  const cardanoPublicKey = deriveCardanoPublicKey(getBytes(Mnemonic.fromPhrase(phrase).entropy));
  const internetComputerPublicKey = ed25519.getPublicKey(deriveSlip10Ed25519(seed, [44, 223, 0]));
  const osmosisWallet = HDNodeWallet.fromPhrase(phrase, undefined, "m/44'/118'/0'/0/0");
  const polkadotPayload = new Uint8Array([0, ...Array.from(polkadotPublicKey)]);
  const polkadotChecksum = blake2b(
    new Uint8Array([...Array.from(asciiBytes('SS58PRE')), ...Array.from(polkadotPayload)])
  ).slice(0, 2);

  return {
    ethereum: ethereumWallet.address,
    bnb: ethereumWallet.address,
    bitcoin: DEMO_BITCOIN_ADDRESS,
    tron: deriveTronAddress(tronWallet.privateKey),
    solana: encodeBase58(solanaPublicKey),
    dogecoin: encodeBase58Check(new Uint8Array([0x1e, ...Array.from(hash160(getBytes(dogecoinWallet.publicKey)))])),
    litecoin: encodeSegwitAddress(litecoinWallet.publicKey, 'ltc'),
    ripple: encodeBase58Check(
      new Uint8Array([0x00, ...Array.from(hash160(getBytes(rippleWallet.publicKey)))]),
      XRP_ALPHABET
    ),
    cosmos: encodeBech32('cosmos', Array.from(hash160(getBytes(cosmosWallet.publicKey)))),
    ethereumClassic: ethereumClassicWallet.address,
    bitcoinCash: encodeBitcoinCashAddress(bitcoinCashWallet.publicKey),
    zcash: encodeBase58Check(
      new Uint8Array([0x1c, 0xb8, ...Array.from(hash160(getBytes(zcashWallet.publicKey)))])
    ),
    sui: `0x${hex(blake2b(new Uint8Array([0, ...Array.from(suiPublicKey)]), { dkLen: 32 }))}`,
    aptos: `0x${hex(sha3_256(new Uint8Array([...Array.from(aptosPublicKey), 0])))}`,
    near: hex(nearPublicKey),
    stellar: encodeStellarAddress(stellarPublicKey),
    polkadot: encodeBase58(new Uint8Array([...Array.from(polkadotPayload), ...Array.from(polkadotChecksum)])),
    ton: encodeTonAddress(tonPublicKey),
    cardano: encodeCardanoAddress(cardanoPublicKey),
    internetComputer: encodeInternetComputerAddress(internetComputerPublicKey),
    osmosis: encodeBech32('osmo', Array.from(hash160(getBytes(osmosisWallet.publicKey)))),
  };
};

export const createWalletSetup = (): WalletSetupResult => {
  const wallet = Wallet.createRandom();
  const mnemonic = wallet.mnemonic?.phrase;
  if (!mnemonic) {
    throw new Error('Secure wallet generation is unavailable in this browser.');
  }
  return {
    address: wallet.address,
    addresses: deriveWalletAddresses(mnemonic),
    mnemonic,
    wallet: new Wallet(wallet.privateKey),
  };
};

export const walletFromPhrase = (input: string): Wallet => {
  const mnemonic = normalizePhrase(input);
  if (!Mnemonic.isValidMnemonic(mnemonic)) {
    throw new Error('Enter a valid BIP-39 recovery phrase with a correct checksum.');
  }
  return new Wallet(Wallet.fromPhrase(mnemonic).privateKey);
};

export const deriveWalletAddress = (input: string): string => walletFromPhrase(input).address;

export const unlockEncryptedWallet = (json: string, password: string): Promise<HDNodeWallet | Wallet> =>
  Wallet.fromEncryptedJson(json, password);

export const generatePhraseChallenge = (phrase: string): number[] => {
  const words = phrase.split(' ');
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Secure browser randomness is unavailable.');
  }
  const selected = new Set<number>();
  while (selected.size < 3) {
    const value = new Uint32Array(1);
    globalThis.crypto.getRandomValues(value);
    selected.add(value[0] % words.length);
  }
  return Array.from(selected).sort((a, b) => a - b);
};
