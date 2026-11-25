import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TrustShield from '../components/common/TrustShield';
import { loginAccount, registerAccount } from '../services/authApi';
import { saveAccountSession } from '../services/authSession';
import { useWalletSetup } from '../wallet/WalletSetupContext';

type Mode = 'signup' | 'login';

const AccountAuth: React.FC = () => {
  const navigate = useNavigate();
  const { hasVault } = useWalletSetup();
  const [mode, setMode] = useState<Mode>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isSignup = mode === 'signup';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const session = isSignup
        ? await registerAccount({ email, password, name })
        : await loginAccount({ email, password });
      saveAccountSession(session);
      setPassword('');
      // Without a wallet vault the portfolio route redirects back to onboarding,
      // so send the user there directly and confirm the account was created.
      if (hasVault) {
        navigate('/portfolio', { replace: true });
      } else {
        navigate('/onboarding', {
          replace: true,
          state: { accountEmail: session.user.email, accountCreated: isSignup },
        });
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'The account request could not be completed.'
      );
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(isSignup ? 'login' : 'signup');
    setError('');
  };

  return (
    <div className="min-h-screen bg-surface px-4 pb-safe pt-safe text-on-surface">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col">
        <div className="flex items-center justify-between py-3">
          <span className="h-10 w-10" aria-hidden="true" />
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
            Account
          </span>
          <span className="h-10 w-10" aria-hidden="true" />
        </div>

        <div className="mt-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high">
            <TrustShield className="h-9 w-9" />
          </div>
          <h1 className="text-[22px] font-medium leading-7">
            {isSignup ? 'Create your account' : 'Sign in'}
          </h1>
          <p className="mt-2 max-w-xs text-sm leading-5 text-on-surface-variant">
            {isSignup
              ? 'Create an account to keep your portfolio in sync across your devices.'
              : 'Welcome back. Enter your email and password to continue.'}
          </p>
        </div>

        <div
          aria-label="Account action"
          className="mt-6 flex rounded-full bg-surface-container-low p-1"
          role="group"
        >
          <button
            aria-pressed={!isSignup}
            className={`flex-1 rounded-full py-2.5 text-sm font-medium transition-colors ${
              !isSignup ? 'bg-primary-container text-white' : 'text-on-surface-variant'
            }`}
            onClick={() => { setMode('login'); setError(''); }}
            type="button"
          >
            Sign in
          </button>
          <button
            aria-pressed={isSignup}
            className={`flex-1 rounded-full py-2.5 text-sm font-medium transition-colors ${
              isSignup ? 'bg-primary-container text-white' : 'text-on-surface-variant'
            }`}
            onClick={() => { setMode('signup'); setError(''); }}
            type="button"
          >
            Create account
          </button>
        </div>

        <form className="mt-6" onSubmit={submit}>
          {isSignup && (
            <>
              <label className="block text-sm text-on-surface-variant" htmlFor="account-name">
                Name
              </label>
              <input
                autoComplete="name"
                className="mt-2 w-full rounded-xl border border-white/10 bg-surface-container-low p-3 text-sm text-on-surface"
                id="account-name"
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
                type="text"
                value={name}
              />
            </>
          )}

          <label className={`block text-sm text-on-surface-variant ${isSignup ? 'mt-4' : ''}`} htmlFor="account-email">
            Email
          </label>
          <input
            autoComplete="email"
            autoFocus
            className="mt-2 w-full rounded-xl border border-white/10 bg-surface-container-low p-3 text-sm text-on-surface"
            id="account-email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />

          <label className="mt-4 block text-sm text-on-surface-variant" htmlFor="account-password">
            Password
          </label>
          <input
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            className="mt-2 w-full rounded-xl border border-white/10 bg-surface-container-low p-3 text-sm text-on-surface"
            id="account-password"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
          {isSignup && (
            <p className="mt-2 text-xs leading-5 text-on-surface-variant">
              At least 8 characters.
            </p>
          )}

          <button
            className="mt-5 w-full rounded-full bg-primary-container py-3.5 text-sm font-medium text-white disabled:opacity-50"
            disabled={busy}
            type="submit"
          >
            {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {error && <p aria-live="polite" className="mt-3 text-center text-sm text-error">{error}</p>}

        <button
          className="mt-3 w-full py-3 text-sm text-primary"
          onClick={switchMode}
          type="button"
        >
          {isSignup ? 'Already have an account? Sign in' : 'New to Trust Wallet? Create an account'}
        </button>

        <button
          className="mt-auto py-6 text-sm text-primary"
          onClick={() => navigate('/onboarding')}
          type="button"
        >
          Skip for now
        </button>
      </main>
    </div>
  );
};

export default AccountAuth;
