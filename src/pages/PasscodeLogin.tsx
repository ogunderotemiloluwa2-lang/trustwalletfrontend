import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TrustShield from '../components/common/TrustShield';
import PasswordField from '../components/common/PasswordField';
import { useWalletSetup } from '../wallet/WalletSetupContext';

const PasscodeLogin: React.FC = () => {
  const navigate = useNavigate();
  const {
    hasSessionPin,
    unlockWithPassword,
    unlockWithSessionPin,
  } = useWalletSetup();
  const [usePassword, setUsePassword] = useState(!hasSessionPin);
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await unlockWithPassword(password);
      setPassword('');
      navigate('/portfolio', { replace: true });
    } catch {
      setError('Wallet could not be unlocked. Check your password and try again.');
    } finally {
      setBusy(false);
    }
  };

  const submitPin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (unlockWithSessionPin(pin)) {
      setPin('');
      navigate('/portfolio', { replace: true });
    } else {
      setError('Incorrect six-digit code.');
      setPin('');
    }
  };

  const showPinForm = hasSessionPin && !usePassword;

  return (
    <div className="min-h-screen bg-surface px-4 pb-safe pt-safe text-on-surface">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col">
        <div className="flex items-center justify-between py-3">
          <button
            aria-label="Back to start"
            className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            onClick={() => navigate('/onboarding')}
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
            {showPinForm ? 'Enter your code' : 'Unlock your wallet'}
          </h1>
          <p className="mt-2 max-w-xs text-sm leading-5 text-on-surface-variant">
            {showPinForm
              ? 'Enter the six-digit code you chose when you created your wallet.'
              : 'Enter your wallet password to continue.'}
          </p>
        </div>

        {showPinForm ? (
          <form className="mt-8" onSubmit={submitPin}>
            <label className="block text-sm text-on-surface-variant" htmlFor="wallet-unlock-pin">
              Six-digit code
            </label>
            <PasswordField
              autoComplete="one-time-code"
              autoFocus
              id="wallet-unlock-pin"
              inputClassName="text-center text-lg tracking-[0.5em]"
              inputMode="numeric"
              label="six-digit code"
              maxLength={6}
              onChange={(value) => setPin(value.replace(/\D/g, ''))}
              pattern="\d{6}"
              required
              value={pin}
            />
            <button
              className="mt-5 w-full rounded-full bg-primary-container py-3.5 text-sm font-medium text-white"
              type="submit"
            >
              Unlock wallet
            </button>
            <button
              className="mt-3 w-full py-3 text-sm text-primary"
              onClick={() => { setUsePassword(true); setError(''); }}
              type="button"
            >
              Use wallet password instead
            </button>
          </form>
        ) : (
          <form className="mt-8" onSubmit={submitPassword}>
            <label className="block text-sm text-on-surface-variant" htmlFor="wallet-unlock-password">
              Wallet password
            </label>
            <PasswordField
              autoComplete="current-password"
              autoFocus
              id="wallet-unlock-password"
              label="wallet password"
              onChange={setPassword}
              required
              value={password}
            />
            <button
              className="mt-5 w-full rounded-full bg-primary-container py-3.5 text-sm font-medium text-white disabled:opacity-50"
              disabled={busy}
              type="submit"
            >
              {busy ? 'Unlocking…' : 'Unlock wallet'}
            </button>
            {hasSessionPin && (
              <button
                className="mt-3 w-full py-3 text-sm text-primary"
                onClick={() => { setUsePassword(false); setError(''); }}
                type="button"
              >
                Use six-digit code
              </button>
            )}
          </form>
        )}

        {error && <p aria-live="polite" className="mt-3 text-center text-sm text-error">{error}</p>}
        <aside className="mt-6 rounded-2xl border border-error/20 bg-error-container/30 p-4 text-xs leading-5 text-on-surface-variant">
          Never share your wallet password. Anyone who has it can access your funds on this device.
        </aside>
        <button
          className="mt-auto py-6 text-sm text-primary"
          onClick={() => navigate('/import-wallet')}
        >
          Restore with recovery phrase
        </button>
      </main>
    </div>
  );
};

export default PasscodeLogin;
