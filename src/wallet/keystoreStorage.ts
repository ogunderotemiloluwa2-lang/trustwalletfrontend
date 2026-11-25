import type { WalletAddresses } from './walletSetup';

const DATABASE_NAME = 'trust-wallet-vault';
const DATABASE_VERSION = 1;
const STORE_NAME = 'vault';
const VAULT_KEY = 'encrypted-keystore';
const NETWORK_KEY = 'selected-network';
const ADDRESSES_KEY = 'wallet-addresses';

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Secure browser storage is not available.'));
      return;
    }

    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Could not open encrypted wallet storage.'));
    request.onblocked = () => reject(new Error('Wallet storage is blocked by another browser tab.'));
  });

const withStore = async <T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));
    let result: T;
    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => {
      database.close();
      reject(new Error('Could not access encrypted wallet storage.'));
    };
    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };
    transaction.onerror = () => {
      database.close();
      reject(new Error('Wallet storage transaction failed.'));
    };
    transaction.onabort = () => {
      database.close();
      reject(new Error('Wallet storage transaction was aborted.'));
    };
  });
};

export const readEncryptedKeystore = (): Promise<string | undefined> =>
  withStore('readonly', (store) => store.get(VAULT_KEY));

export const writeEncryptedKeystore = (
  encryptedJson: string,
  addresses: WalletAddresses
): Promise<IDBValidKey> =>
  withStore('readwrite', (store) => {
    store.put(addresses, ADDRESSES_KEY);
    return store.put(encryptedJson, VAULT_KEY);
  });

export const deleteEncryptedKeystore = (): Promise<undefined> =>
  withStore('readwrite', (store) => {
    store.delete(ADDRESSES_KEY);
    return store.delete(VAULT_KEY);
  });

export const readWalletAddresses = (): Promise<WalletAddresses | undefined> =>
  withStore('readonly', (store) => store.get(ADDRESSES_KEY));

export const readSelectedNetwork = (): Promise<string | undefined> =>
  withStore('readonly', (store) => store.get(NETWORK_KEY));

export const writeSelectedNetwork = (network: string): Promise<IDBValidKey> =>
  withStore('readwrite', (store) => store.put(network, NETWORK_KEY));
