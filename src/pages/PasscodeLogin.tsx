import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TrustShield from '../components/common/TrustShield';
import { useWalletSetup } from '../wallet/WalletSetupContext';

const PasscodeLogin: React.FC = () => {
  const navigate = useNavigate();
  const {
    hasSessionPin,
    unlockWithPassword,
    unlockWithSessionPin,
  } = useWalletSetup();
  const [usePin, setUsePin] = useState(hasSessionPin);
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
      setError('Incorrect session PIN.');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-surface px-4 pb-safe pt-safe text-on-surface">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col">
        <div className="flex items-center justify-between py-3">
          <span className="h-10 w-10" aria-hidden="true" />
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
            {usePin && hasSessionPin ? 'Quick unlock' : 'Unlock your wallet'}
          </h1>
          <p className="mt-2 max-w-xs text-sm leading-5 text-on-surface-variant">
            {usePin && hasSessionPin
              ? 'This optional PIN unlocks your wallet for the current session. Your wallet password is required after you close the app.'
              : 'Enter your wallet password to continue.'}
          </p>
        </div>

        {usePin && hasSessionPin ? (
          <form className="mt-8" onSubmit={submitPin}>
            <label className="block text-sm text-on-surface-variant" htmlFor="quick-unlock-pin">
              Six-digit session PIN
            </label>
            <input
              autoComplete="off"
              autoFocus
              className="mt-2 w-full rounded-xl border border-white/10 bg-surface-container-low p-3 text-center text-lg tracking-[0.5em] text-on-surface"
              id="quick-unlock-pin"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
              pattern="\d{6}"
              required
              type="password"
              value={pin}
            />
            <button
              className="mt-5 w-full rounded-full bg-primary-container py-3.5 text-sm font-medium text-white"
              type="submit"
            >
              Unlock session
            </button>
            <button
              className="mt-3 w-full py-3 text-sm text-primary"
              onClick={() => { setUsePin(false); setError(''); }}
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
            <input
              autoComplete="current-password"
              autoFocus
              className="mt-2 w-full rounded-xl border border-white/10 bg-surface-container-low p-3 text-sm text-on-surface"
              id="wallet-unlock-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
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
                onClick={() => { setUsePin(true); setError(''); }}
                type="button"
              >
                Use session PIN
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
