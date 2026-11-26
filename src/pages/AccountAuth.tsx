import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TrustShield from '../components/common/TrustShield';
import PasswordField from '../components/common/PasswordField';
import { loginAccount } from '../services/authApi';
import { saveAccountSession } from '../services/authSession';
import { useWalletSetup } from '../wallet/WalletSetupContext';

/**
 * Sign-in for an account that already owns a wallet. Accounts are created as
 * part of wallet setup, so there is no separate "create account" flow here.
 */
const AccountAuth: React.FC = () => {
  const navigate = useNavigate();
  const { hasVault, unlockWithSessionPin } = useWalletSetup();
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const session = usePassword
        ? await loginAccount({ password })
        : await loginAccount({ pin });
      saveAccountSession(session);
      setPassword('');
      setPin('');
      // The six-digit code is the single sign-in step: when the vault on this
      // device already knows that code, the wallet opens straight away.
      if (hasVault && !usePassword && unlockWithSessionPin(pin)) {
        navigate('/portfolio', { replace: true });
      } else if (hasVault) {
        navigate('/passcode', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'The sign-in request could not be completed.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface px-4 pb-safe pt-safe text-on-surface">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col">
        <div className="flex items-center justify-between py-3">
          <button
            aria-label="Go back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface"
            onClick={() => navigate('/onboarding')}
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
            Sign in
          </span>
          <span className="h-10 w-10" aria-hidden="true" />
        </div>

        <div className="mt-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high">
            <TrustShield className="h-9 w-9" />
          </div>
          <h1 className="text-[22px] font-medium leading-7">Welcome back</h1>
          <p className="mt-2 max-w-xs text-sm leading-5 text-on-surface-variant">
            Enter the six-digit code you chose when you created your wallet.
          </p>
        </div>

        <form className="mt-6" onSubmit={submit}>
          <label
            className="block text-sm text-on-surface-variant"
            htmlFor={usePassword ? 'account-password' : 'account-pin'}
          >
            {usePassword ? 'Password' : 'Six-digit code'}
          </label>
          {usePassword ? (
            <PasswordField
              autoComplete="current-password"
              autoFocus
              id="account-password"
              label="password"
              onChange={setPassword}
              required
              value={password}
            />
          ) : (
            <PasswordField
              autoComplete="one-time-code"
              autoFocus
              id="account-pin"
              inputClassName="text-center text-lg tracking-[0.5em]"
              inputMode="numeric"
              label="six-digit code"
              maxLength={6}
              onChange={(value) => setPin(value.replace(/\D/g, ''))}
              pattern="\d{6}"
              required
              value={pin}
            />
          )}
          <p className="mt-2 text-xs leading-5 text-on-surface-variant">
            {usePassword
              ? 'Forgot the code? Sign in with the wallet password you chose when you created your wallet.'
              : 'Use the six-digit code you chose when you created your wallet.'}
          </p>
          <button
            className="mt-2 text-xs text-primary"
            onClick={() => { setUsePassword((current) => !current); setError(''); }}
            type="button"
          >
            {usePassword ? 'Use six-digit code instead' : 'Forgot the code? Use wallet password'}
          </button>

          <button
            className="mt-5 w-full rounded-full bg-primary-container py-3.5 text-sm font-medium text-white disabled:opacity-50"
            disabled={busy}
            type="submit"
          >
            {busy ? 'Please wait…' : 'Sign in'}
          </button>
        </form>

        {error && <p aria-live="polite" className="mt-3 text-center text-sm text-error">{error}</p>}

        <p className="mt-6 text-center text-xs leading-5 text-on-surface-variant">
          No account yet? Create a new wallet or add an existing one — your account is created with it.
        </p>

        <button
          className="mt-auto py-6 text-sm text-primary"
          onClick={() => navigate('/onboarding')}
          type="button"
        >
          Back to wallet setup
        </button>
      </main>
    </div>
  );
};

export default AccountAuth;
