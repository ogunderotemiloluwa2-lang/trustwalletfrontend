import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import TrustShield from '../components/common/TrustShield';
import { generatePhraseChallenge } from '../wallet/walletSetup';
import { useWalletSetup } from '../wallet/WalletSetupContext';

const RecoveryPhraseBackup: React.FC = () => {
  const navigate = useNavigate();
  const { mnemonic, discardPendingWallet } = useWalletSetup();
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(true);
  const [affirmed, setAffirmed] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [challengeIndices, setChallengeIndices] = useState<number[] | null>(null);
  const [challengeAnswers, setChallengeAnswers] = useState<string[]>(['', '', '']);
  const [challengeError, setChallengeError] = useState('');
  const recoveryPhrase = mnemonic?.split(' ') ?? [];
  const phraseConfirmed = Boolean(
    challengeIndices &&
    challengeIndices.every((wordIndex, answerIndex) =>
      challengeAnswers[answerIndex].trim().toLowerCase() === recoveryPhrase[wordIndex]
    )
  );

  const handleCopyPhrase = async () => {
    setCopyError('');
    try {
      await navigator.clipboard.writeText(recoveryPhrase.join(' '));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError('Clipboard access failed. Write the phrase down carefully instead.');
    }
  };

  const beginConfirmation = () => {
    if (!affirmed) return;
    if (!mnemonic) {
      setChallengeError('Wallet recovery phrase is unavailable. Restart wallet creation.');
      return;
    }
    try {
      setChallengeIndices(generatePhraseChallenge(mnemonic));
      setChallengeAnswers(['', '', '']);
      setChallengeError('');
    } catch (error) {
      setChallengeError(error instanceof Error ? error.message : 'Could not start phrase confirmation.');
    }
  };

  if (!mnemonic) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="bg-surface min-h-screen flex flex-col pt-safe pb-safe select-none">
      <main className="flex-1 flex flex-col relative w-full bg-surface">
        <div className="flex flex-col w-full px-4 pb-space-xl">
          {/* Top Bar / Step Flow */}
          <div className="flex items-center justify-between py-space-sm mb-space-md">
            <button 
              aria-label="Go back" 
              className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors focus:outline-none"
              onClick={() => {
                discardPendingWallet();
                navigate('/onboarding');
              }}
            >
              <span className="material-symbols-outlined text-[20px]">
                arrow_back
              </span>
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                Step 2 of 3
              </span>
            </div>
            <button 
              aria-label="Get security help" 
              className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors focus:outline-none"
            >
              <span className="material-symbols-outlined text-[20px]">
                help_outline
              </span>
            </button>
          </div>

          {/* Trust Shield Brand Header Icon */}
          <div className="flex flex-col items-center text-center mb-space-lg">
            <div className="relative w-14 h-14 mb-3 flex items-center justify-center">
              <div className="absolute inset-0 bg-primary-container/20 rounded-full blur-md"></div>
              <TrustShield className="w-12 h-12 relative z-10 drop-shadow-sm" />
            </div>
            <h1 className="font-headline-lg-mobile text-[22px] leading-7 text-on-surface tracking-tight mb-1">
              Back up your Secret Phrase
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
              Write down these 12 words in order and keep them somewhere secure and offline.
            </p>
          </div>

          {/* Security Warning Callout */}
          <div className="bg-surface-container-low rounded-DEFAULT p-space-md mb-space-lg shadow-sm flex items-start gap-3">
            <div className="p-2 rounded-full bg-error-container text-on-error-container shrink-0 flex items-center justify-center">
              <span 
                className="material-symbols-outlined text-[20px]" 
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                shield_with_heart
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-label-lg text-label-lg text-error mb-0.5">
                Critical Protection Rule
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                Never share this phrase. Anyone who has it can access your wallet.
              </p>
            </div>
          </div>
          <p className="mb-3 text-center text-xs leading-5 text-on-surface-variant">
            Anyone who sees this phrase can control the wallet it unlocks. Avoid screenshots, cloud notes, and clipboard history.
          </p>
          {copyError && (
            <p aria-live="polite" className="mb-3 text-center text-xs text-error">
              {copyError}
            </p>
          )}

          {/* 12-Word Secret Phrase Card Container */}
          <div className="relative bg-surface-container rounded-DEFAULT p-space-md mb-space-md shadow-md overflow-hidden">
            {/* Active Seed Grid */}
            <div
              className={`grid grid-cols-3 gap-2 sm:gap-2.5 transition-all duration-300 ${
                revealed ? '' : 'blur-md select-none pointer-events-none'
              }`}
              id="seed-grid"
            >
              {recoveryPhrase.map((word, index) => (
                <div
                  key={index}
                  className="bg-surface-container-highest rounded-DEFAULT py-2.5 px-2 flex items-center gap-1.5 shadow-sm"
                >
                  <span className="font-label-sm text-label-sm text-outline w-4 text-right shrink-0">
                    {index + 1}
                  </span>
                  <span className="font-title-sm text-[14px] leading-5 text-on-surface tracking-wide truncate">
                    {word}
                  </span>
                </div>
              ))}
            </div>

            {/* Blur Overlay */}
            {!revealed && (
              <div
                className="absolute inset-0 flex items-center justify-center bg-surface/40 backdrop-blur-[2px]"
                id="blur-overlay"
              >
                <span className="material-symbols-outlined text-on-surface-variant text-3xl">
                  visibility_off
                </span>
              </div>
            )}
          </div>

          {/* Copy / Reveal Action Bar */}
          <div className="grid grid-cols-2 gap-2.5 mb-space-md">
            <button
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-variant active:scale-95 transition-all focus:outline-none"
              onClick={handleCopyPhrase}
            >
              <span
                className={`material-symbols-outlined text-[18px] ${
                  copied ? 'text-tertiary' : 'text-primary'
                }`}
              >
                {copied ? 'done' : 'content_copy'}
              </span>
              <span className="font-label-md text-label-md">
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </span>
            </button>
            <button
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-variant active:scale-95 transition-all focus:outline-none"
              onClick={() => setRevealed((prev) => !prev)}
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">
                {revealed ? 'visibility_off' : 'visibility'}
              </span>
              <span className="font-label-md text-label-md">
                {revealed ? 'Hide Phrase' : 'Reveal Phrase'}
              </span>
            </button>
          </div>

          {/* Security Checklist Affirmation */}
          <label className="flex items-start gap-3 p-space-md rounded-DEFAULT bg-surface-container-low mb-space-lg cursor-pointer select-none">
            <div className="relative flex items-center justify-center mt-0.5">
              <input
                className="sr-only peer"
                type="checkbox"
                checked={affirmed}
                onChange={(e) => setAffirmed(e.target.checked)}
              />
              <div className="w-5 h-5 rounded-md bg-surface-container-highest peer-checked:bg-primary-container transition-colors flex items-center justify-center shadow-inner">
                <span
                  className={`material-symbols-outlined text-[16px] text-white transition-opacity ${
                    affirmed ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  check
                </span>
              </div>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface leading-tight">
              I understand that if I lose my recovery phrase, I will not be able to access my
              crypto assets forever.
            </span>
          </label>

          {!challengeIndices ? (
            <button
              className="w-full rounded-full bg-primary-container py-3.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!affirmed}
              onClick={beginConfirmation}
              type="button"
            >
              I’ve saved my phrase
            </button>
          ) : (
            <section className="mb-5 rounded-2xl bg-surface-container-low p-4">
              <h2 className="text-sm font-medium">Confirm three words</h2>
              <p className="mt-1 text-xs text-on-surface-variant">
                Enter the requested words in order to continue.
              </p>
              <div className="mt-3 space-y-3">
                {challengeIndices.map((wordIndex, answerIndex) => (
                  <label className="block text-xs text-on-surface-variant" key={wordIndex}>
                    Word {wordIndex + 1}
                    <input
                      autoCapitalize="none"
                      autoComplete="off"
                      autoCorrect="off"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-surface-container p-3 text-sm text-on-surface"
                      onChange={(event) => {
                        const nextAnswers = [...challengeAnswers];
                        nextAnswers[answerIndex] = event.target.value;
                        setChallengeAnswers(nextAnswers);
                      }}
                      spellCheck={false}
                      value={challengeAnswers[answerIndex]}
                    />
                  </label>
                ))}
              </div>
              {challengeError && (
                <p aria-live="polite" className="mt-2 text-xs text-error">{challengeError}</p>
              )}
            </section>
          )}

          {/* Password setup follows successful phrase confirmation */}
          <div className="w-full mt-auto pt-space-xs">
            <button
              className={`w-full py-4 rounded-full bg-primary-container text-white font-label-lg text-label-lg shadow-lg shadow-primary-container/25 flex items-center justify-center gap-2 transition-all focus:outline-none ${
                phraseConfirmed
                  ? 'active:scale-[0.99] hover:bg-secondary-container'
                  : 'opacity-40 cursor-not-allowed'
              }`}
              disabled={!phraseConfirmed}
              onClick={() => navigate('/secure-wallet')}
            >
              <span>Continue to password</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RecoveryPhraseBackup;