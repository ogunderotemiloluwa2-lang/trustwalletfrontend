import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TrustShield from '../components/common/TrustShield';
import SecurityBadge from '../components/common/SecurityBadge';
import { useWalletSetup } from '../wallet/WalletSetupContext';

const WelcomeOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { createWallet } = useWalletSetup();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [setupError, setSetupError] = useState('');

  const accountNotice = (location.state as { accountEmail?: string; accountCreated?: boolean } | null) || {};

  const slides = [
    {
      title: "One wallet. Multiple networks.",
      description: "A single recovery phrase gives you an address on every network you use, so one wallet covers them all."
    },
    {
      title: "Your assets stay on-chain",
      description: "Switching networks only changes which network you are viewing. It never creates another wallet or account."
    },
    {
      title: "Your keys, your crypto",
      description: "Your recovery phrase is the only way to restore your wallet. Keep it somewhere safe and never share it."
    },
    {
      title: "Everything in one place",
      description: "Track balances across Ethereum, BNB Chain, Bitcoin, Tron, and more from a single portfolio."
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleCreateWallet = () => {
    setSetupError('');
    try {
      createWallet();
      navigate('/recovery-phrase');
    } catch (error) {
      setSetupError(
        error instanceof Error ? error.message : 'Wallet setup could not be started.'
      );
    }
  };

  const handleImportWallet = () => {
    navigate('/import-wallet');
  };

  return (
    <div className="bg-surface min-h-screen flex flex-col pt-safe pb-safe select-none">
      <main className="flex-1 flex flex-col relative w-full bg-surface">
        <div className="flex flex-col w-full px-4 pb-space-lg">
          {/* Top Simulated Mobile Bar & Shield Brand Hero */}
          <div className="relative w-full flex flex-col items-center pt-2">
            {/* Ambient Blue Radiant Glow behind Shield */}
            <div 
              className="absolute top-12 w-56 h-56 bg-primary-container/25 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse"
              style={{ animationDuration: '4s' }}
            ></div>
            <div className="absolute top-20 w-32 h-32 bg-tertiary/15 rounded-full blur-2xl pointer-events-none -z-10"></div>
            
            {/* Network / App Status Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high/90 mb-6 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-ping"></span>
              <span className="font-label-sm text-label-sm text-tertiary uppercase tracking-wider">
                Wallet setup
              </span>
            </div>

            {/* Centered Glowing Trust Wallet Protective Shield Emblem */}
            <div className="relative flex items-center justify-center mb-6 group cursor-pointer">
              <div className="w-28 h-28 rounded-full bg-gradient-to-b from-primary-container/30 to-transparent flex items-center justify-center p-3 shadow-xl">
                <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center shadow-md relative overflow-hidden">
                  <TrustShield 
                    className="w-12 h-14 transition-transform duration-300 ease-out group-hover:scale-110 drop-shadow-[0_0_16px_rgba(5,0,255,0.7)]"
                  />
                </div>
              </div>
              {/* Micro decorative sparkles */}
              <span 
                className="material-symbols-outlined text-tertiary-fixed text-base absolute -top-1 -right-1 animate-bounce"
                style={{ animationDuration: '2.5s' }}
              >
                arrow_back_ios_new
              </span>
            </div>

            {/* Carousel Slide Content */}
            <div className="text-center max-w-xs mx-auto">
              <h1 className="font-headline-lg-mobile text-[22px] leading-7 text-on-surface tracking-tight font-semibold mb-2.5">
                {slides[currentSlide].title}
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed px-1">
                {slides[currentSlide].description}
              </p>
            </div>

            {/* Active Carousel Indicators */}
            <div aria-label="Slide Indicator" className="flex items-center justify-center gap-1.5 mt-5 mb-6">
              {slides.map((_, index) => (
                <div 
                  key={index}
                  className={`rounded-full transition-all ${
                    index === currentSlide 
                      ? 'w-6 h-1.5 bg-primary-container' 
                      : 'w-1.5 h-1.5 bg-surface-container-highest'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Security Feature Badges / Highlights */}
          <div className="w-full flex flex-col gap-2.5 my-2">
            <SecurityBadge
              icon="verified_user"
              title="Recovery phrase setup"
              description="Create or import a recovery phrase"
              iconColor="text-tertiary"
              trailing={
                <span className="material-symbols-outlined text-on-surface-variant text-sm">
                  lock
                </span>
              }
            />
            <SecurityBadge
              icon="hub"
              title="Connected networks"
              description="Ethereum, BNB Chain, Bitcoin, Tron"
              iconColor="text-primary"
              trailing={
                <span className="px-2 py-0.5 rounded-full bg-surface-container-highest font-label-sm text-label-sm text-on-surface-variant">
                  2
                </span>
              }
            />
            <SecurityBadge
              icon="fingerprint"
              title="Password-encrypted wallet"
              description="Encrypted on this device"
              iconColor="text-tertiary-fixed-dim"
              trailing={
                <span className="material-symbols-outlined text-tertiary text-sm">
                  check_circle
                </span>
              }
            />
          </div>

          {/* Bottom CTA Actions Stack */}
          <div className="w-full flex flex-col gap-3 mt-4 pt-1">
            {setupError && (
              <p aria-live="polite" className="text-center text-sm text-error">
                {setupError}
              </p>
            )}
            {/* Account confirmation after sign-up or sign-in */}
            {accountNotice.accountEmail && (
              <p
                aria-live="polite"
                className="mb-3 w-full rounded-2xl border border-primary/20 bg-surface-container-high px-4 py-3 text-center font-body-sm text-body-sm text-on-surface-variant"
              >
                {accountNotice.accountCreated ? 'Account created for ' : 'Signed in as '}
                <span className="text-on-surface">{accountNotice.accountEmail}</span>. Create or
                import a wallet to continue.
              </p>
            )}

            {/* Primary CTA: Create new wallet */}
            <button
              className="w-full py-4 px-6 rounded-full bg-primary-container text-white font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-lg shadow-primary-container/30 transition-all duration-200 active:scale-[0.98] hover:bg-secondary-container"
              onClick={handleCreateWallet}
            >
              <span>Create a new wallet</span>
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>

            {/* Secondary CTA: Add existing wallet */}
            <button
              className="w-full py-3.5 px-6 rounded-full bg-surface-container-high text-on-surface font-label-lg text-label-lg flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] hover:bg-surface-container-highest"
              onClick={handleImportWallet}
            >
              <span className="material-symbols-outlined text-lg text-on-surface-variant">
                download_for_offline
              </span>
              <span>Add existing wallet</span>
            </button>

            {/* Tertiary CTA: Account sign-in */}
            <button
              className="w-full py-3.5 px-6 rounded-full text-primary font-label-lg text-label-lg flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
              onClick={() => navigate('/account')}
            >
              <span className="material-symbols-outlined text-lg">person</span>
              <span>Sign in or create an account</span>
            </button>

            {/* Micro-copy Footer Legal Link */}
            <p className="text-center font-body-sm text-body-sm text-on-surface-variant mt-2 px-4 leading-normal">
              By continuing, you agree to our{' '}
              <button
                className="text-primary underline hover:text-primary-fixed-dim transition-colors"
                onClick={() => console.log('Terms')}
              >
                Terms of Service
              </button>{' '}
              &amp;{' '}
              <button
                className="text-primary underline hover:text-primary-fixed-dim transition-colors"
                onClick={() => console.log('Privacy')}
              >
                Privacy Policy
              </button>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WelcomeOnboarding;