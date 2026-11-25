import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { HDNodeWallet, Wallet } from 'ethers';
import {
  deleteEncryptedKeystore,
  readEncryptedKeystore,
  readSelectedNetwork,
  readWalletAddresses,
  writeEncryptedKeystore,
  writeSelectedNetwork,
} from './keystoreStorage';
import {
  createWalletSetup,
  DEMO_BITCOIN_ADDRESS,
  deriveWalletAddresses,
  unlockEncryptedWallet,
  WalletAddresses,
  walletFromPhrase,
} from './walletSetup';
import { isWalletNetwork } from './chainRegistry';
import type { WalletNetwork } from './chainRegistry';

type WalletSigner = Wallet | HDNodeWallet;
export type { WalletNetwork } from './chainRegistry';

interface WalletSetupContextValue {
  address: string | null;
  receiveAddresses: WalletAddresses | null;
  mnemonic: string | null;
  isReady: boolean;
  hasVault: boolean;
  hasPendingWallet: boolean;
  isUnlocked: boolean;
  hasSessionPin: boolean;
  network: WalletNetwork;
  storageError: string;
  createWallet: () => void;
  importWallet: (phrase: string) => string;
  completeSetup: (password: string, sessionPin?: string) => Promise<void>;
  unlockWithPassword: (password: string) => Promise<void>;
  unlockWithSessionPin: (pin: string) => boolean;
  lockWithSessionPin: () => boolean;
  lockWithPassword: () => void;
  discardPendingWallet: () => void;
  deleteVault: (password: string) => Promise<void>;
  selectNetwork: (network: WalletNetwork) => Promise<void>;
}

const WalletSetupContext = createContext<WalletSetupContextValue | null>(null);

export const WalletSetupProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [receiveAddresses, setReceiveAddresses] = useState<WalletAddresses | null>(null);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [pendingWallet, setPendingWallet] = useState<Wallet | null>(null);
  const [pendingAddresses, setPendingAddresses] = useState<WalletAddresses | null>(null);
  const [wallet, setWallet] = useState<WalletSigner | null>(null);
  const [sessionPin, setSessionPin] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasVault, setHasVault] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [network, setNetwork] = useState<WalletNetwork>('ethereum');
  const [storageError, setStorageError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([readEncryptedKeystore(), readSelectedNetwork(), readWalletAddresses()])
      .then(([keystore, savedNetwork, savedAddresses]) => {
        if (!active) return;
        setHasVault(Boolean(keystore));
        if (savedAddresses) setReceiveAddresses(savedAddresses);
        if (savedNetwork && isWalletNetwork(savedNetwork)) {
          setNetwork(savedNetwork);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setStorageError(error instanceof Error ? error.message : 'Wallet storage is unavailable.');
        }
      })
      .finally(() => {
        if (active) setIsReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const createWallet = useCallback(() => {
    const result = createWalletSetup();
    setPendingWallet(result.wallet);
    setPendingAddresses(result.addresses);
    setReceiveAddresses(result.addresses);
    setAddress(result.address);
    setMnemonic(result.mnemonic);
  }, []);

  const importWallet = useCallback((phrase: string) => {
    const imported = walletFromPhrase(phrase);
    const addresses = deriveWalletAddresses(phrase);
    setPendingWallet(imported);
    setPendingAddresses(addresses);
    setReceiveAddresses(addresses);
    setAddress(imported.address);
    setMnemonic(null);
    return imported.address;
  }, []);

  const completeSetup = useCallback(async (password: string, pin?: string) => {
    if (!pendingWallet) {
      throw new Error('Create or import a wallet before setting its password.');
    }

    const encryptedJson = await pendingWallet.encrypt(password);
    if (!pendingAddresses) {
      throw new Error('Wallet receive addresses are unavailable. Re-import the recovery phrase.');
    }
    await writeEncryptedKeystore(encryptedJson, pendingAddresses);
    setWallet(pendingWallet);
    setReceiveAddresses(pendingAddresses);
    setAddress(pendingWallet.address);
    setPendingWallet(null);
    setPendingAddresses(null);
    setMnemonic(null);
    setSessionPin(pin || null);
    setHasVault(true);
    setIsUnlocked(true);
  }, [pendingWallet, pendingAddresses]);

  const unlockWithPassword = useCallback(async (password: string) => {
    const encryptedJson = await readEncryptedKeystore();
    if (!encryptedJson) {
      throw new Error('No encrypted wallet was found in this browser.');
    }
    const unlockedWallet = await unlockEncryptedWallet(encryptedJson, password);
    const savedAddresses = await readWalletAddresses();
    setWallet(unlockedWallet);
    setReceiveAddresses(savedAddresses ?? {
      ethereum: unlockedWallet.address,
      bnb: unlockedWallet.address,
      bitcoin: DEMO_BITCOIN_ADDRESS,
      tron: '',
      solana: '',
      dogecoin: '',
      litecoin: '',
      ripple: '',
      cosmos: '',
      ethereumClassic: '',
      bitcoinCash: '',
      zcash: '',
    });
    setAddress(unlockedWallet.address);
    setIsUnlocked(true);
    setSessionPin(null);
  }, []);

  const unlockWithSessionPin = useCallback((pin: string) => {
    if (!sessionPin || pin !== sessionPin || !wallet) return false;
    setIsUnlocked(true);
    return true;
  }, [sessionPin, wallet]);

  const lockWithSessionPin = useCallback(() => {
    if (!sessionPin || !wallet) return false;
    setIsUnlocked(false);
    return true;
  }, [sessionPin, wallet]);

  const lockWithPassword = useCallback(() => {
    setWallet(null);
    setAddress(null);
    setReceiveAddresses(null);
    setIsUnlocked(false);
    setSessionPin(null);
  }, []);

  const discardPendingWallet = useCallback(() => {
    setPendingWallet(null);
    setPendingAddresses(null);
    setReceiveAddresses(null);
    setMnemonic(null);
    setAddress(null);
  }, []);

  const deleteVault = useCallback(async (password: string) => {
    const encryptedJson = await readEncryptedKeystore();
    if (!encryptedJson) throw new Error('No encrypted wallet was found.');
    await unlockEncryptedWallet(encryptedJson, password);
    await deleteEncryptedKeystore();
    setWallet(null);
    setPendingWallet(null);
    setPendingAddresses(null);
    setAddress(null);
    setReceiveAddresses(null);
    setMnemonic(null);
    setSessionPin(null);
    setIsUnlocked(false);
    setHasVault(false);
  }, []);

  const selectNetwork = useCallback(async (selected: WalletNetwork) => {
    await writeSelectedNetwork(selected);
    setNetwork(selected);
  }, []);

  const value = useMemo(
    () => ({
      address,
      receiveAddresses,
      mnemonic,
      isReady,
      hasVault,
      hasPendingWallet: Boolean(pendingWallet),
      isUnlocked,
      hasSessionPin: Boolean(sessionPin),
      network,
      storageError,
      createWallet,
      importWallet,
      completeSetup,
      unlockWithPassword,
      unlockWithSessionPin,
      lockWithSessionPin,
      lockWithPassword,
      discardPendingWallet,
      deleteVault,
      selectNetwork,
    }),
    [
      address, receiveAddresses, mnemonic, isReady, hasVault, pendingWallet, isUnlocked, sessionPin, network, storageError,
      createWallet, importWallet, completeSetup, unlockWithPassword,
      unlockWithSessionPin, lockWithSessionPin, lockWithPassword,
      discardPendingWallet, deleteVault, selectNetwork,
    ]
  );

  return <WalletSetupContext.Provider value={value}>{children}</WalletSetupContext.Provider>;
};

export const useWalletSetup = (): WalletSetupContextValue => {
  const context = useContext(WalletSetupContext);
  if (!context) throw new Error('useWalletSetup must be used within WalletSetupProvider.');
  return context;
};
