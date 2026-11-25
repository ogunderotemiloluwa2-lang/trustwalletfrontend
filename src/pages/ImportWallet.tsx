import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TrustShield from '../components/common/TrustShield';
import { useWalletSetup } from '../wallet/WalletSetupContext';

const ImportWallet: React.FC = () => {
  const navigate = useNavigate();
  const { importWallet, hasVault } = useWalletSetup();
  const [phrase, setPhrase] = useState('');
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [confirmReplacement, setConfirmReplacement] = useState(false);

  const handleImport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    try {
      const importedAddress = importWallet(phrase);
      setPhrase('');
      setAddress(importedAddress);
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : 'Unable to import this recovery phrase.'
      );
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
            Import wallet
          </span>
          <span className="h-10 w-10" aria-hidden="true" />
        </div>

        <div className="flex flex-col items-center pt-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high">
            <TrustShield className="h-9 w-9" />
          </div>
          <h1 className="text-[22px] font-semibold leading-7">Import with recovery phrase</h1>
          <p className="mt-2 max-w-xs text-sm leading-5 text-on-surface-variant">
            Enter your recovery phrase to restore your Ethereum, BNB Chain, Bitcoin, and Tron addresses.
          </p>
        </div>

        {address ? (
          <section aria-live="polite" className="mt-8 rounded-2xl bg-surface-container-low p-4">
            <h2 className="font-label-lg text-label-lg">Phrase validated</h2>
            <p className="mt-2 text-xs text-on-surface-variant">
              Your Ethereum address
            </p>
            <code className="mt-1 block break-all rounded-xl bg-surface-container p-3 text-xs">
              {address}
            </code>
            {hasVault && (
              <p className="mt-3 rounded-xl border border-error/20 bg-error-container/30 p-3 text-xs leading-5 text-on-surface-variant">
                This replaces the wallet currently saved on this device. You can only restore the old wallet with its recovery phrase.
              </p>
            )}
            <p className="mt-3 text-xs leading-5 text-on-surface-variant">
              The phrase is kept only until you set a password to protect the imported wallet.
            </p>
            <button
              className="mt-5 w-full rounded-full bg-primary-container py-3 text-sm font-medium text-white"
              onClick={() => navigate('/secure-wallet')}
            >
              Continue
            </button>
          </section>
        ) : (
          <form className="mt-8 flex flex-1 flex-col" onSubmit={handleImport}>
            <label className="text-sm text-on-surface-variant" htmlFor="recovery-phrase-input">
              Recovery phrase
            </label>
            <textarea
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-white/10 bg-surface-container-low p-4 text-sm leading-6 text-on-surface placeholder:text-outline focus:border-primary focus:outline-none"
              id="recovery-phrase-input"
              onChange={(event) => setPhrase(event.target.value)}
              placeholder="Enter your 12, 15, 18, 21, or 24 words separated by spaces"
              spellCheck={false}
              value={phrase}
            />
            {hasVault && (
              <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-on-surface-variant">
                <input
                  checked={confirmReplacement}
                  className="mt-0.5 h-4 w-4 accent-primary"
                  onChange={(event) => setConfirmReplacement(event.target.checked)}
                  type="checkbox"
                />
                I understand this replaces the wallet saved on this device.
              </label>
            )}
            {error && (
              <p aria-live="polite" className="mt-3 text-sm text-error">
                {error}
              </p>
            )}
            <aside className="mt-4 rounded-2xl border border-error/20 bg-error-container/30 p-4 text-xs leading-5 text-on-surface-variant">
              Only enter your recovery phrase into this app. Never share it with anyone — anyone who has it can access your wallet.
            </aside>
            <button
              className="mb-6 mt-auto w-full rounded-full bg-primary-container py-3.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!phrase.trim() || (hasVault && !confirmReplacement)}
              type="submit"
            >
              Validate phrase
            </button>
          </form>
        )}
      </main>
    </div>
  );
};

export default ImportWallet;
