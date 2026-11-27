import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TrustShield from '../components/common/TrustShield';
import PinInput from '../components/common/PinInput';
import PasswordField from '../components/common/PasswordField';
import CreateAccountLink from '../components/common/CreateAccountLink';
import { loginAccount, setAccountPin } from '../services/authApi';
import { clearAccountSession, saveAccountSession } from '../services/authSession';
import { useWalletSetup } from '../wallet/WalletSetupContext';

/** How long the round spinner stays up once the code is accepted. */
const UNLOCK_SPINNER_MS = 2500;

/**
 * Opens the encrypted wallet. The six-digit code is the only credential here:
 * the wallet password is used once to sign in, and the recovery phrase restores
 * the account on a new device.
 *
 * The code is verified against the account stored in MongoDB, so it works on
 * any device the owner signs in on, not just the one that created the wallet.
 * A forgotten code is replaced by confirming the wallet password, which is also
 * checked against MongoDB before the new code is saved.
 */
const PasscodeLogin: React.FC = () => {
  const navigate = useNavigate();
  const { unlockWithVerifiedPin, updateSessionPin, prepareCodeUnlock, lockWithPassword } = useWalletSetup();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [password, setPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const submitPin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      // The server holds the authoritative hash of the code, so the account is
      // signed in with it before the local vault is opened.
      const session = await loginAccount({ pin });
      saveAccountSession(session);
      const opened = await unlockWithVerifiedPin(pin);
      if (!opened) {
        setError('This device cannot open the wallet with that code. Sign in with your wallet password, or restore the wallet with your recovery phrase.');
        setPin('');
        return;
      }
      setPin('');
      // Hold the round spinner briefly so the unlock reads as a deliberate step.
      await new Promise((resolve) => setTimeout(resolve, UNLOCK_SPINNER_MS));
      navigate('/portfolio', { replace: true });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'The six-digit code could not be verified.'
      );
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    setNotice('');
    if (newPin !== confirmPin) {
      setError('The two codes do not match.');
      return;
    }
    setBusy(true);
    try {
      // Signing in with the password proves it against MongoDB, and the fresh
      // token is what authorises replacing the code on the account.
      const session = await loginAccount({ password });
      saveAccountSession(session);
      await setAccountPin(session.token, newPin);
      // The vault is encrypted with the wallet password, so it has to be
      // remembered again for the new code to open the wallet.
      const vaultReady = await prepareCodeUnlock(password);
      updateSessionPin(newPin);
      setPassword('');
      setNewPin('');
      setConfirmPin('');
      setResetting(false);
      setNotice(
        vaultReady
          ? 'Your six-digit code has been updated. Enter it to open your wallet.'
          : 'Your six-digit code has been updated, but this device cannot open the wallet with it. Restore the wallet with your recovery phrase.'
      );
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : 'The six-digit code could not be updated.'
      );
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    if (resetting) {
      setResetting(false);
      setError('');
      setPassword('');
      setNewPin('');
      setConfirmPin('');
      return;
    }
    // Leaving the code screen means signing out on this device: the password is
    // needed again, so the remembered session and vault key are dropped.
    clearAccountSession();
    lockWithPassword();
    navigate('/account', { replace: true });
  };

  return (
    <div className="min-h-screen bg-surface px-4 pb-safe pt-safe text-on-surface">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col">
        <div className="flex items-center justify-between py-3">
          <button
            aria-label={resetting ? 'Back to the code screen' : 'Back to sign in'}
            className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            onClick={goBack}
            type="button"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
            Encrypted wallet
          </span>
          <span className="h-10 w-10" aria-hidden="true" />
        </div>

        <div className="mt-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high">
            <TrustShield className="h-9 w-9" />
          </div>
          <h1 className="text-[22px] font-medium leading-7">
            {resetting ? 'Reset your code' : 'Enter your code'}
          </h1>
          <p className="mt-2 max-w-xs text-sm leading-5 text-on-surface-variant">
            {resetting
              ? 'Confirm your wallet password, then choose a new six-digit code.'
              : 'Enter the six-digit code you chose when you created your wallet.'}
          </p>
        </div>

        {resetting ? (
          <form className="mt-8" onSubmit={submitReset}>
            <label className="block text-sm text-on-surface-variant" htmlFor="reset-password">
              Wallet password
            </label>
            <PasswordField
              autoComplete="current-password"
              autoFocus
              id="reset-password"
              label="wallet password"
              onChange={setPassword}
              required
              value={password}
            />

            <p className="mt-5 text-sm text-on-surface-variant">New six-digit code</p>
            <PinInput
              disabled={busy}
              id="reset-new-pin"
              label="New six-digit code"
              onChange={setNewPin}
              value={newPin}
            />

            <p className="mt-5 text-sm text-on-surface-variant">Confirm new code</p>
            <PinInput
              disabled={busy}
              id="reset-confirm-pin"
              label="Confirm new six-digit code"
              onChange={setConfirmPin}
              value={confirmPin}
            />

            <button
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary-container py-3.5 text-sm font-medium text-white disabled:opacity-50"
              disabled={busy || !password || newPin.length !== 6 || confirmPin.length !== 6}
              type="submit"
            >
              {busy && (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
              )}
              {busy ? 'Saving your code…' : 'Save new code'}
            </button>
          </form>
        ) : (
          <form className="mt-8" onSubmit={submitPin}>
            <PinInput
              autoFocus
              disabled={busy}
              id="wallet-unlock-pin"
              label="Six-digit code"
              onChange={setPin}
              value={pin}
            />
            <button
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary-container py-3.5 text-sm font-medium text-white disabled:opacity-50"
              disabled={busy || pin.length !== 6}
              type="submit"
            >
              {busy && (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
              )}
              {busy ? 'Opening your wallet…' : 'Unlock wallet'}
            </button>
          </form>
        )}

        {error && <p aria-live="polite" className="mt-3 text-center text-sm text-error">{error}</p>}
        {notice && <p aria-live="polite" className="mt-3 text-center text-sm text-primary">{notice}</p>}

        {!resetting && (
          <button
            className="mt-4 text-sm text-primary"
            onClick={() => {
              setResetting(true);
              setError('');
              setNotice('');
              setPin('');
            }}
            type="button"
          >
            Forgot your code? Reset it
          </button>
        )}

        <aside className="mt-6 rounded-2xl border border-error/20 bg-error-container/30 p-4 text-xs leading-5 text-on-surface-variant">
          Never share your six-digit code. Anyone who has it can open your wallet on this device.
        </aside>
        <CreateAccountLink className="mt-4" />
        <button
          className="mt-auto py-6 text-sm text-primary"
          onClick={() => navigate('/import-wallet')}
          type="button"
        >
          Restore with recovery phrase
        </button>
      </main>
    </div>
  );
};

export default PasscodeLogin;
