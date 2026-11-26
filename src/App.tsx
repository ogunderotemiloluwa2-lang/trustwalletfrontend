import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Pages
import WelcomeOnboarding from './pages/WelcomeOnboarding';
import PasscodeLogin from './pages/PasscodeLogin';
import RecoveryPhraseBackup from './pages/RecoveryPhraseBackup';
import MainAssetsPortfolio from './pages/MainAssetsPortfolio';
import ImportWallet from './pages/ImportWallet';
import AccountAuth from './pages/AccountAuth';
import { WalletSetupProvider } from './wallet/WalletSetupContext';
import SecureWalletSetup from './pages/SecureWalletSetup';
import { useWalletSetup } from './wallet/WalletSetupContext';
import { readAccountSession } from './services/authSession';

const LoadingWalletState = () => (
  <div className="flex min-h-screen items-center justify-center bg-surface px-6 text-center text-sm text-on-surface-variant">
    Checking encrypted wallet storage…
  </div>
);

const OnboardingRoute: React.FC = () => {
  const { isReady, storageError, hasVault } = useWalletSetup();
  if (!isReady) return <LoadingWalletState />;
  if (storageError) return <div role="alert" className="p-6 text-error">{storageError}</div>;
  // An account already exists on this device, so the owner signs in instead of
  // walking through wallet setup again.
  if (hasVault) return <Navigate to="/account" replace />;
  return <WelcomeOnboarding />;
};

const RecoveryRoute: React.FC = () => {
  const { isReady, mnemonic } = useWalletSetup();
  if (!isReady) return <LoadingWalletState />;
  return mnemonic ? <RecoveryPhraseBackup /> : <Navigate to="/onboarding" replace />;
};

const SecureSetupRoute: React.FC = () => {
  const { isReady, hasPendingWallet } = useWalletSetup();
  if (!isReady) return <LoadingWalletState />;
  return hasPendingWallet ? <SecureWalletSetup /> : <Navigate to="/onboarding" replace />;
};

const ImportRoute: React.FC = () => {
  const { isReady, storageError } = useWalletSetup();
  if (!isReady) return <LoadingWalletState />;
  if (storageError) return <div role="alert" className="p-6 text-error">{storageError}</div>;
  return <ImportWallet />;
};

const UnlockRoute: React.FC = () => {
  const { isReady, hasVault, isUnlocked } = useWalletSetup();
  if (!isReady) return <LoadingWalletState />;
  if (isUnlocked) return <Navigate to="/portfolio" replace />;
  return hasVault ? <PasscodeLogin /> : <Navigate to="/onboarding" replace />;
};

const AccountRoute: React.FC = () => {
  const { isReady, isUnlocked } = useWalletSetup();
  if (!isReady) return <LoadingWalletState />;
  if (isUnlocked) return <Navigate to="/portfolio" replace />;
  // Signing in is a one-off per device: an owner who already signed in only
  // enters the six-digit code to open the wallet.
  if (readAccountSession()) return <Navigate to="/passcode" replace />;
  return <AccountAuth />;
};

const PortfolioRoute: React.FC = () => {
  const { isReady, hasVault, isUnlocked } = useWalletSetup();
  if (!isReady) return <LoadingWalletState />;
  if (!hasVault) return <Navigate to="/onboarding" replace />;
  return isUnlocked ? <MainAssetsPortfolio /> : <Navigate to="/passcode" replace />;
};

const StartRoute: React.FC = () => {
  const { isReady, hasVault, isUnlocked } = useWalletSetup();
  if (!isReady) return <LoadingWalletState />;
  // Once an account exists the app always opens on the sign-in screen, never on
  // the wallet setup flow.
  if (isUnlocked) return <Navigate to="/portfolio" replace />;
  return <Navigate to={hasVault ? '/account' : '/onboarding'} replace />;
};

function App() {
  useEffect(() => {
    document.title = 'Trust Wallet';
  }, []);

  return (
    <Router>
      <WalletSetupProvider>
        <div className="min-h-screen bg-surface text-on-surface font-body-md">
          <Routes>
            <Route path="/" element={<StartRoute />} />
            <Route path="/onboarding" element={<OnboardingRoute />} />
            <Route path="/account" element={<AccountRoute />} />
            <Route path="/import-wallet" element={<ImportRoute />} />
            <Route path="/secure-wallet" element={<SecureSetupRoute />} />
            <Route path="/passcode" element={<UnlockRoute />} />
            <Route path="/recovery-phrase" element={<RecoveryRoute />} />
            <Route path="/portfolio" element={<PortfolioRoute />} />
          </Routes>
        </div>
      </WalletSetupProvider>
    </Router>
  );
}

export default App;
