import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletSetup } from '../wallet/WalletSetupContext';

const SecureWalletSetup: React.FC = () => {
  const navigate = useNavigate();
  const { completeSetup, discardPendingWallet, storageError } = useWalletSetup();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [useSessionPin, setUseSessionPin] = useState(false);
  const [pin, setPin] = useState('');
  const [pinConfirmation, setPinConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (password.length < 12) {
      setError('Use a wallet password at least 12 characters long.');
      return;
    }
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }
    if (useSessionPin && (!/^\d{6}$/.test(pin) || pin !== pinConfirmation)) {
      setError('Enter and confirm the same six-digit session PIN.');
      return;
    }

    setSaving(true);
    try {
      await completeSetup(password, useSessionPin ? pin : undefined);
      setPassword('');
      setConfirmation('');
      setPin('');
      setPinConfirmation('');
      navigate('/portfolio', { replace: true });
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : 'Wallet encryption failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface px-4 pb-safe pt-safe text-on-surface">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col">
        <div className="flex items-center justify-between py-3">
          <button
            aria-label="Cancel wallet setup"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface"
            onClick={() => {
              discardPendingWallet();
              navigate('/onboarding');
            }}
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
            Secure your wallet
          </span>
          <span className="h-10 w-10" aria-hidden="true" />
        </div>

        <form className="mt-8 flex flex-1 flex-col" onSubmit={handleSubmit}>
          <h1 className="text-[22px] font-semibold leading-7">Create wallet password</h1>
          <p className="mt-2 text-sm leading-5 text-on-surface-variant">
            This password encrypts your wallet and is required every time you unlock it.
          </p>

          <label className="mt-6 text-sm text-on-surface-variant" htmlFor="wallet-password">
            Wallet password
          </label>
          <input
            autoComplete="new-password"
            className="mt-2 w-full rounded-xl border border-white/10 bg-surface-container-low p-3 text-sm text-on-surface focus:border-primary focus:outline-none"
            id="wallet-password"
            minLength={12}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />

          <label className="mt-4 text-sm text-on-surface-variant" htmlFor="confirm-wallet-password">
            Confirm wallet password
          </label>
          <input
            autoComplete="new-password"
            className="mt-2 w-full rounded-xl border border-white/10 bg-surface-container-low p-3 text-sm text-on-surface focus:border-primary focus:outline-none"
            id="confirm-wallet-password"
            onChange={(event) => setConfirmation(event.target.value)}
            required
            type="password"
            value={confirmation}
          />
          <p className="mt-2 text-xs leading-5 text-on-surface-variant">
            There is no password reset service. If you forget it, you must restore using your recovery phrase.
          </p>

          <label className="mt-5 flex items-start gap-3 rounded-xl bg-surface-container-low p-3 text-xs leading-5 text-on-surface-variant">
            <input
              checked={useSessionPin}
              className="mt-0.5 h-4 w-4 accent-primary"
              onChange={(event) => setUseSessionPin(event.target.checked)}
              type="checkbox"
            />
            <span>
              Add an optional six-digit PIN for quick locking in this open tab. It is not stored and does not encrypt the wallet; after reload, use the wallet password.
            </span>
          </label>

          {useSessionPin && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-xs text-on-surface-variant" htmlFor="session-pin">
                Six-digit PIN
                <input
                  autoComplete="off"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-surface-container-low p-3 text-sm text-on-surface"
                  id="session-pin"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
                  pattern="\d{6}"
                  value={pin}
                />
              </label>
              <label className="text-xs text-on-surface-variant" htmlFor="confirm-session-pin">
                Confirm PIN
                <input
                  autoComplete="off"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-surface-container-low p-3 text-sm text-on-surface"
                  id="confirm-session-pin"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => setPinConfirmation(event.target.value.replace(/\D/g, ''))}
                  pattern="\d{6}"
                  value={pinConfirmation}
                />
              </label>
            </div>
          )}

          {(error || storageError) && (
            <p aria-live="polite" className="mt-3 text-sm text-error">
              {error || storageError}
            </p>
          )}
          <aside className="mt-5 rounded-2xl border border-error/20 bg-error-container/30 p-4 text-xs leading-5 text-on-surface-variant">
            Your wallet is encrypted on this device. Keep your password and recovery phrase safe — anyone who obtains them can access your funds.
          </aside>
          <button
            className="mb-6 mt-auto w-full rounded-full bg-primary-container py-3.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            disabled={saving || Boolean(storageError)}
            type="submit"
          >
            {saving ? 'Encrypting wallet…' : 'Encrypt and continue'}
          </button>
        </form>
      </main>
    </div>
  );
};

export default SecureWalletSetup;
