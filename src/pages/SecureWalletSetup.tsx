import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PasswordField from '../components/common/PasswordField';
import { useWalletSetup } from '../wallet/WalletSetupContext';

const SecureWalletSetup: React.FC = () => {
  const navigate = useNavigate();
  const { completeSetup, discardPendingWallet, storageError } = useWalletSetup();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirmation, setPinConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Enter the name for this wallet.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address for this wallet.');
      return;
    }
    if (password.length < 12) {
      setError('Use a wallet password at least 12 characters long.');
      return;
    }
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }
    if (!/^\d{6}$/.test(pin) || pin !== pinConfirmation) {
      setError('Enter and confirm the same six-digit code.');
      return;
    }

    setSaving(true);
    try {
      await completeSetup(password, pin, { name, email });
      setName('');
      setEmail('');
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
          <h1 className="text-[22px] font-semibold leading-7">Create your wallet</h1>
          <p className="mt-2 text-sm leading-5 text-on-surface-variant">
            Your name and email identify this wallet. The password encrypts it on this device, and the six-digit code signs you in.
          </p>

          <label className="mt-6 text-sm text-on-surface-variant" htmlFor="wallet-owner-name">
            Your name
          </label>
          <input
            autoComplete="name"
            className="mt-2 w-full rounded-xl border border-white/10 bg-surface-container-low p-3 text-sm text-on-surface focus:border-primary focus:outline-none"
            id="wallet-owner-name"
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            required
            type="text"
            value={name}
          />

          <label className="mt-4 text-sm text-on-surface-variant" htmlFor="wallet-owner-email">
            Email
          </label>
          <input
            autoComplete="email"
            className="mt-2 w-full rounded-xl border border-white/10 bg-surface-container-low p-3 text-sm text-on-surface focus:border-primary focus:outline-none"
            id="wallet-owner-email"
            maxLength={254}
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
          <p className="mt-2 text-xs leading-5 text-on-surface-variant">
            This email and your six-digit code are how you sign back in to this wallet.
          </p>

          <label className="mt-5 text-sm text-on-surface-variant" htmlFor="wallet-password">
            Wallet password
          </label>
          <PasswordField
            autoComplete="new-password"
            className="mt-2 w-full rounded-xl border border-white/10 bg-surface-container-low p-3 text-sm text-on-surface focus:border-primary focus:outline-none"
            id="wallet-password"
            label="wallet password"
            minLength={12}
            onChange={setPassword}
            required
            value={password}
          />

          <label className="mt-4 text-sm text-on-surface-variant" htmlFor="confirm-wallet-password">
            Confirm wallet password
          </label>
          <PasswordField
            autoComplete="new-password"
            className="mt-2 w-full rounded-xl border border-white/10 bg-surface-container-low p-3 text-sm text-on-surface focus:border-primary focus:outline-none"
            id="confirm-wallet-password"
            label="confirm wallet password"
            onChange={setConfirmation}
            required
            value={confirmation}
          />
          <p className="mt-2 text-xs leading-5 text-on-surface-variant">
            There is no password reset service. If you forget it, you must restore using your recovery phrase.
          </p>

          <label className="mt-5 block text-sm text-on-surface-variant" htmlFor="wallet-pin">
            Six-digit sign-in code
          </label>
          <PasswordField
            autoComplete="off"
            className="mt-2 w-full rounded-xl border border-white/10 bg-surface-container-low p-3 text-sm text-on-surface focus:border-primary focus:outline-none"
            id="wallet-pin"
            inputClassName="text-center text-lg tracking-[0.5em]"
            inputMode="numeric"
            label="six-digit code"
            maxLength={6}
            onChange={(value) => setPin(value.replace(/\D/g, ''))}
            pattern="\d{6}"
            required
            value={pin}
          />
          <p className="mt-2 text-xs leading-5 text-on-surface-variant">
            You will use this code, together with your email, to sign in from now on. It is stored securely on the server, never in this browser.
          </p>
          <label className="mt-4 block text-sm text-on-surface-variant" htmlFor="confirm-wallet-pin">
            Confirm six-digit code
          </label>
          <PasswordField
            autoComplete="off"
            className="mt-2 w-full rounded-xl border border-white/10 bg-surface-container-low p-3 text-sm text-on-surface focus:border-primary focus:outline-none"
            id="confirm-wallet-pin"
            inputClassName="text-center text-lg tracking-[0.5em]"
            inputMode="numeric"
            label="confirm six-digit code"
            maxLength={6}
            onChange={(value) => setPinConfirmation(value.replace(/\D/g, ''))}
            pattern="\d{6}"
            required
            value={pinConfirmation}
          />

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
