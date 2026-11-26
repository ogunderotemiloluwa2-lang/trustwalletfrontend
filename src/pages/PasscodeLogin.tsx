import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TrustShield from '../components/common/TrustShield';
import PinInput from '../components/common/PinInput';
import { useWalletSetup } from '../wallet/WalletSetupContext';

/**
 * Opens the encrypted wallet. The six-digit code is the only credential here:
 * the wallet password is used once to sign in, and the recovery phrase restores
 * the account on a new device.
 */
const PasscodeLogin: React.FC = () => {
  const navigate = useNavigate();
  const { unlockWithSessionPin } = useWalletSetup();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

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
          <h1 className="text-[22px] font-medium leading-7">Enter your code</h1>
          <p className="mt-2 max-w-xs text-sm leading-5 text-on-surface-variant">
            Enter the six-digit code you chose when you created your wallet.
          </p>
        </div>

        <form className="mt-8" onSubmit={submitPin}>
          <PinInput
            autoFocus
            id="wallet-unlock-pin"
            label="Six-digit code"
            onChange={setPin}
            value={pin}
          />
          <button
            className="mt-5 w-full rounded-full bg-primary-container py-3.5 text-sm font-medium text-white disabled:opacity-50"
            disabled={pin.length !== 6}
            type="submit"
          >
            Unlock wallet
          </button>
        </form>

        {error && <p aria-live="polite" className="mt-3 text-center text-sm text-error">{error}</p>}
        <aside className="mt-6 rounded-2xl border border-error/20 bg-error-container/30 p-4 text-xs leading-5 text-on-surface-variant">
          Never share your six-digit code. Anyone who has it can open your wallet on this device.
        </aside>
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
