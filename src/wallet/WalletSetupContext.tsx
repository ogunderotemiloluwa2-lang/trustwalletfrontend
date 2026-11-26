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
  BITCOIN_RECEIVE_ADDRESS,
  createWalletSetup,
  deriveWalletAddresses,
  unlockEncryptedWallet,
  WalletAddresses,
  walletFromPhrase,
} from './walletSetup';
import { isWalletNetwork } from './chainRegistry';
import type { WalletNetwork } from './chainRegistry';
import {
  clearSessionActivity,
  clearSessionLocked,
  forgetSessionPin,
  forgetUnlock,
  isSessionIdle,
  markSessionActivity,
  markSessionLocked,
  readRememberedUnlock,
  readSessionLocked,
  readSessionPin,
  rememberSessionPin,
  rememberUnlock,
} from './sessionUnlock';
import { readAccountSession, saveAccountSession } from '../services/authSession';
import { loginAccount, registerAccount, setAccountPin } from '../services/authApi';
import { saveWalletRecord } from '../services/walletApi';

type WalletSigner = Wallet | HDNodeWallet;
export type { WalletNetwork } from './chainRegistry';

/** Identity collected while creating the wallet; it owns the account record. */
export interface WalletOwnerIdentity {
  name: string;
}

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
  completeSetup: (password: string, pin: string, identity: WalletOwnerIdentity) => Promise<void>;
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
  // Tracks whether the pending wallet came from a recovery phrase so the saved
  // record can report the correct source.
  const importedWalletRef = React.useRef(false);
  const [wallet, setWallet] = useState<WalletSigner | null>(null);
  const [sessionPin, setSessionPin] = useState<string | null>(() => readSessionPin());
  const [isReady, setIsReady] = useState(false);
  const [hasVault, setHasVault] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [network, setNetwork] = useState<WalletNetwork>('ethereum');
  const [storageError, setStorageError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([readEncryptedKeystore(), readSelectedNetwork(), readWalletAddresses()])
      .then(async ([keystore, savedNetwork, savedAddresses]) => {
        if (!active) return;
        setHasVault(Boolean(keystore));
        if (savedAddresses) setReceiveAddresses(savedAddresses);
        if (savedNetwork && isWalletNetwork(savedNetwork)) {
          setNetwork(savedNetwork);
        }

        // A refresh inside the same tab should not force the user to sign in
        // again, so re-open the vault with the password kept for this tab.
        // An explicit lock keeps the wallet closed until the six-digit code is
        // entered, but the signer is still restored so that code can unlock it.
        const rememberedPassword = keystore ? readRememberedUnlock() : null;
        if (!rememberedPassword) return;
        // Coming back after the idle timeout must not silently restore the
        // session, so the wallet stays locked until the code is entered again.
        if (isSessionIdle()) {
          markSessionLocked();
          return;
        }
        try {
          const restoredWallet = await unlockEncryptedWallet(keystore as string, rememberedPassword);
          if (!active) return;
          setWallet(restoredWallet);
          setAddress(restoredWallet.address);
          setIsUnlocked(!readSessionLocked());
        } catch {
          // The stored password no longer opens the vault; fall back to the
          // unlock screen instead of surfacing a storage error.
          forgetUnlock();
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
    importedWalletRef.current = false;
    setPendingWallet(result.wallet);
    setPendingAddresses(result.addresses);
    setReceiveAddresses(result.addresses);
    setAddress(result.address);
    setMnemonic(result.mnemonic);
  }, []);

  const importWallet = useCallback((phrase: string) => {
    const imported = walletFromPhrase(phrase);
    const addresses = deriveWalletAddresses(phrase);
    importedWalletRef.current = true;
    setPendingWallet(imported);
    setPendingAddresses(addresses);
    setReceiveAddresses(addresses);
    setAddress(imported.address);
    setMnemonic(null);
    return imported.address;
  }, []);

  const completeSetup = useCallback(async (
    password: string,
    pin: string,
    identity: WalletOwnerIdentity
  ) => {
    if (!pendingWallet) {
      throw new Error('Create or import a wallet before setting its password.');
    }
    if (!/^\d{6}$/.test(pin)) {
      throw new Error('Choose a six-digit sign-in code.');
    }
    const ownerName = identity.name.trim();
    if (!ownerName) {
      throw new Error('Enter the name for this wallet.');
    }

    const encryptedJson = await pendingWallet.encrypt(password);
    if (!pendingAddresses) {
      throw new Error('Wallet receive addresses are unavailable. Re-import the recovery phrase.');
    }
    await writeEncryptedKeystore(encryptedJson, pendingAddresses);
    rememberUnlock(password);
    clearSessionLocked();
    setWallet(pendingWallet);
    setReceiveAddresses(pendingAddresses);
    setAddress(pendingWallet.address);
    setPendingWallet(null);
    setPendingAddresses(null);
    setMnemonic(null);
    setSessionPin(pin);
    rememberSessionPin(pin);
    markSessionActivity();
    setHasVault(true);
    setIsUnlocked(true);

    // The wallet owns the account: creating a wallet creates (or signs into)
    // the account that stores it, so there is no separate signup step. The
    // account must exist on the server, otherwise the wallet could not be
    // restored on another device.
    let session = readAccountSession();
    if (!session) {
      try {
        session = await registerAccount({ password, name: ownerName });
      } catch (registerError) {
        try {
          session = await loginAccount({ password });
        } catch {
          throw new Error(
            registerError instanceof Error && registerError.message
              ? registerError.message
              : 'Could not reach the wallet service. Check your connection and try again.'
          );
        }
      }
    }

    try {
      await saveWalletRecord(session.token, {
        address: pendingWallet.address,
        label: `${ownerName}'s wallet`,
        ownerName,
        source: importedWalletRef.current ? 'imported' : 'created',
        network,
        addresses: pendingAddresses as unknown as Record<string, string>,
      });
    } catch (error) {
      throw new Error(
        error instanceof Error && error.message
          ? error.message
          : 'Could not save this wallet to your account. Check your connection and try again.'
      );
    }
    try {
      // The six-digit code replaces the password for future sign-ins, so it
      // is hashed and stored on the server rather than in this browser.
      const user = await setAccountPin(session.token, pin);
      saveAccountSession({ token: session.token, user });
    } catch {
      // Sign-in still works with the wallet password if this call fails.
      saveAccountSession(session);
    }
  }, [pendingWallet, pendingAddresses, network]);

  const unlockWithPassword = useCallback(async (password: string) => {
    const encryptedJson = await readEncryptedKeystore();
    if (!encryptedJson) {
      throw new Error('No encrypted wallet was found in this browser.');
    }
    const unlockedWallet = await unlockEncryptedWallet(encryptedJson, password);
    const savedAddresses = await readWalletAddresses();
    rememberUnlock(password);
    clearSessionLocked();
    markSessionActivity();
    setWallet(unlockedWallet);
    setReceiveAddresses(savedAddresses ?? {
      ethereum: unlockedWallet.address,
      bnb: unlockedWallet.address,
      bitcoin: BITCOIN_RECEIVE_ADDRESS,
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
  }, []);

  const unlockWithSessionPin = useCallback((pin: string) => {
    if (!sessionPin || pin !== sessionPin || !wallet) return false;
    clearSessionLocked();
    markSessionActivity();
    setIsUnlocked(true);
    return true;
  }, [sessionPin, wallet]);

  const lockWithSessionPin = useCallback(() => {
    if (!sessionPin || !wallet) return false;
    // An explicit lock must survive a refresh, so remember that the user locked
    // the wallet even though the password stays available for the code unlock.
    markSessionLocked();
    setIsUnlocked(false);
    return true;
  }, [sessionPin, wallet]);

  const lockWithPassword = useCallback(() => {
    forgetUnlock();
    forgetSessionPin();
    clearSessionActivity();
    markSessionLocked();
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
    forgetUnlock();
    forgetSessionPin();
    clearSessionActivity();
    clearSessionLocked();
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
