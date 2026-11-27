import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TrustShield from '../components/common/TrustShield';
import PasswordField from '../components/common/PasswordField';
import CreateAccountLink from '../components/common/CreateAccountLink';
import { loginAccount } from '../services/authApi';
import { saveAccountSession } from '../services/authSession';
import { useWalletSetup } from '../wallet/WalletSetupContext';

/**
 * Sign-in for an account that already owns a wallet. Accounts are created as
 * part of wallet setup, so there is no separate "create account" flow here.
 *
 * The wallet password signs the owner in. Opening the encrypted wallet is a
 * separate step: the six-digit code unlocks it on the passcode screen, and the
 * recovery phrase restores the account on a new device.
 */
const AccountAuth: React.FC = () => {
  const navigate = useNavigate();
  const { hasVault, prepareCodeUnlock } = useWalletSetup();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const session = await loginAccount({ password });
      saveAccountSession(session);
      // The vault is encrypted with this password, so it is remembered here to
      // let the six-digit code open the wallet on the next screen. The vault
      // itself stays locked until that code is entered.
      if (hasVault) await prepareCodeUnlock(password);
      setPassword('');
      // Signing in never opens the vault on its own: the six-digit code does
      // that on the passcode screen.
      if (hasVault) {
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
          {hasVault ? (
            // With a wallet on this device there is no setup flow to go back to,
            // so the arrow is left out rather than bouncing back to this screen.
            <span className="h-10 w-10" aria-hidden="true" />
          ) : (
            <button
              aria-label="Go back"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface"
              onClick={() => navigate('/onboarding')}
              type="button"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
          )}
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
            Sign in with your wallet password, then open the wallet with your six-digit code.
          </p>
        </div>

        <form className="mt-6" onSubmit={submit}>
          <label
            className="block text-sm text-on-surface-variant"
            htmlFor="account-password"
          >
            Wallet password
          </label>
          <PasswordField
            autoComplete="current-password"
            autoFocus
            id="account-password"
            label="wallet password"
            onChange={setPassword}
            required
            value={password}
          />
          <p className="mt-2 text-xs leading-5 text-on-surface-variant">
            Use the wallet password you chose when you created your wallet.
          </p>

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
          Forgot the password? Restore the account with your recovery phrase.
        </p>

        <button
          className="mt-2 text-sm text-primary"
          onClick={() => navigate('/import-wallet')}
          type="button"
        >
          Restore with recovery phrase
        </button>

        <p className="mt-6 text-center text-xs leading-5 text-on-surface-variant">
          No account yet? Create a new wallet or add an existing one — your account is created with it.
        </p>

        <CreateAccountLink className="mt-2" />

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
