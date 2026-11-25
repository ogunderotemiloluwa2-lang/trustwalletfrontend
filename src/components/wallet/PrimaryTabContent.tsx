import React, { useEffect, useState } from 'react';

export type PrimaryTab = 'home' | 'swap' | 'explore' | 'settings';
type SettingsAction = 'wallets' | 'security' | 'manage_tokens' | 'settings';

interface PrimaryTabContentProps {
  tab: Exclude<PrimaryTab, 'home'>;
  nativeSymbol: string;
  assetSymbols: string[];
  onSettingsAction: (action: SettingsAction) => void;
  onLockWallet: () => void;
}

const cardClassName = 'rounded-2xl border border-white/[0.06] bg-tw-surface-container-low p-4';

const PrimaryTabContent: React.FC<PrimaryTabContentProps> = ({
  tab,
  nativeSymbol,
  assetSymbols,
  onSettingsAction,
  onLockWallet,
}) => {
  const [payAmount, setPayAmount] = useState('');
  const [payToken, setPayToken] = useState(nativeSymbol);
  const [receiveToken, setReceiveToken] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!assetSymbols.includes(payToken)) setPayToken(nativeSymbol);
    if (!assetSymbols.includes(receiveToken)) {
      setReceiveToken(assetSymbols.find((symbol) => symbol !== nativeSymbol) ?? '');
    }
  }, [assetSymbols, nativeSymbol, payToken, receiveToken]);

  if (tab === 'swap') {
    return (
      <section aria-labelledby="swap-screen-title" className="flex flex-col gap-4">
        <div>
          <h1 className="font-display text-xl font-medium text-tw-on-surface" id="swap-screen-title">Swap</h1>
          <p className="mt-1 text-xs text-tw-on-surface-variant">Exchange tokens across supported networks.</p>
        </div>
        <div className="relative flex flex-col gap-2">
          <label className={cardClassName}>
            <span className="text-xs text-tw-on-surface-variant">You pay</span>
            <span className="mt-3 flex items-center justify-between gap-3">
              <input
                aria-label="Amount to pay"
                className="min-w-0 flex-1 bg-transparent text-2xl text-tw-on-surface outline-none placeholder:text-tw-on-surface-variant"
                inputMode="decimal"
                onChange={(event) => setPayAmount(event.target.value)}
                placeholder="0"
                type="number"
                min="0"
              />
              <select
                aria-label="Token to pay"
                className="max-w-32 rounded-full bg-tw-surface-container-high px-3 py-2 text-sm text-tw-on-surface"
                onChange={(event) => setPayToken(event.target.value)}
                value={payToken}
              >
                {assetSymbols.map((symbol) => <option key={symbol} value={symbol}>{symbol}</option>)}
              </select>
            </span>
            <span className="mt-2 block text-xs text-tw-on-surface-variant">Available balances are shown on Home.</span>
          </label>
          <div className="z-10 -my-5 flex justify-center">
            <button
              aria-label="Reverse swap direction"
              className="flex h-10 w-10 items-center justify-center rounded-xl border-4 border-tw-surface bg-tw-surface-container-high text-tw-primary"
              onClick={() => {
                setPayToken(receiveToken || nativeSymbol);
                setReceiveToken(payToken);
                setPayAmount('');
              }}
              type="button"
            >
              <span className="material-symbols-outlined text-xl">swap_vert</span>
            </button>
          </div>
          <div className={cardClassName}>
            <span className="text-xs text-tw-on-surface-variant">You get</span>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-2xl text-tw-on-surface">—</span>
              <select
                aria-label="Token to receive"
                className="max-w-40 rounded-full bg-tw-surface-container-high px-3 py-2 text-sm text-tw-on-surface"
                onChange={(event) => setReceiveToken(event.target.value)}
                value={receiveToken}
              >
                <option value="">Select token</option>
                {assetSymbols.map((symbol) => <option key={symbol} value={symbol}>{symbol}</option>)}
              </select>
            </div>
            <span className="mt-2 block text-xs text-tw-on-surface-variant">You will see the estimated amount before you confirm.</span>
          </div>
        </div>
        <div className={cardClassName}>
          <p className="text-sm font-medium text-tw-on-surface">Swap details</p>
          <dl className="mt-3 space-y-2 text-xs text-tw-on-surface-variant">
            <div className="flex justify-between"><dt>Network fee</dt><dd>Unavailable</dd></div>
            <div className="flex justify-between"><dt>Slippage</dt><dd>Unavailable</dd></div>
            <div className="flex justify-between"><dt>Route</dt><dd>Unavailable</dd></div>
          </dl>
        </div>
        <button
          className="w-full rounded-full bg-tw-primary py-3 text-sm font-medium text-tw-on-primary opacity-60"
          disabled
          title={payAmount ? 'Swap is not available yet.' : 'Enter an amount to preview a swap.'}
          type="button"
        >
          Swap unavailable
        </button>
        <p className="text-center text-xs leading-5 text-tw-on-surface-variant">
          Swap is not available yet. No transaction is created or sent from this screen.
        </p>
      </section>
    );
  }

  if (tab === 'explore') {
    return (
      <section aria-labelledby="explore-screen-title" className="flex flex-col gap-5">
        <div>
          <h1 className="font-display text-xl font-medium text-tw-on-surface" id="explore-screen-title">Explore</h1>
          <p className="mt-1 text-xs text-tw-on-surface-variant">Discover Web3 apps and services.</p>
        </div>
        <label className="relative block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-tw-on-surface-variant">search</span>
          <input
            aria-label="Search or enter URL"
            className="h-12 w-full rounded-xl border border-white/[0.06] bg-tw-surface-container-low pl-10 pr-3 text-sm text-tw-on-surface placeholder:text-tw-on-surface-variant outline-none focus:border-tw-primary/50"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search or enter URL"
            type="search"
            value={searchQuery}
          />
        </label>
        <div className={`${cardClassName} flex flex-col items-center py-8 text-center`}>
          <span className="material-symbols-outlined text-3xl text-tw-primary">travel_explore</span>
          <h2 className="mt-3 text-sm font-medium text-tw-on-surface">DApp browser</h2>
          <p className="mt-2 max-w-xs text-xs leading-5 text-tw-on-surface-variant">
            {searchQuery
              ? 'Search is not available yet. No site has been opened and your wallet stays disconnected.'
              : 'DApp browsing is not available yet. This screen will not connect your wallet to a website.'}
          </p>
        </div>
        <div className={cardClassName}>
          <h2 className="text-sm font-medium text-tw-on-surface">DeFi & staking</h2>
          <p className="mt-2 text-xs leading-5 text-tw-on-surface-variant">
            Staking and protocol discovery are not available yet. Always review a protocol carefully before connecting a wallet.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="settings-screen-title" className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl font-medium text-tw-on-surface" id="settings-screen-title">Settings</h1>
        <p className="mt-1 text-xs text-tw-on-surface-variant">Manage your wallet and security preferences.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-tw-surface-container-low">
        <button className="flex w-full items-center gap-3 border-b border-white/[0.06] p-4 text-left" onClick={() => onSettingsAction('wallets')} type="button">
          <span className="material-symbols-outlined text-tw-primary">account_balance_wallet</span>
          <span className="flex-1"><span className="block text-sm text-tw-on-surface">Wallets & networks</span><span className="mt-1 block text-xs text-tw-on-surface-variant">View address and select a supported network</span></span>
          <span className="material-symbols-outlined text-sm text-tw-on-surface-variant">chevron_right</span>
        </button>
        <button className="flex w-full items-center gap-3 border-b border-white/[0.06] p-4 text-left" onClick={() => onSettingsAction('security')} type="button">
          <span className="material-symbols-outlined text-tw-primary">shield_lock</span>
          <span className="flex-1"><span className="block text-sm text-tw-on-surface">Security</span><span className="mt-1 block text-xs text-tw-on-surface-variant">Wallet lock and security information</span></span>
          <span className="material-symbols-outlined text-sm text-tw-on-surface-variant">chevron_right</span>
        </button>
        <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => onSettingsAction('manage_tokens')} type="button">
          <span className="material-symbols-outlined text-tw-primary">currency_exchange</span>
          <span className="flex-1"><span className="block text-sm text-tw-on-surface">Manage crypto</span><span className="mt-1 block text-xs text-tw-on-surface-variant">Control asset visibility</span></span>
          <span className="material-symbols-outlined text-sm text-tw-on-surface-variant">chevron_right</span>
        </button>
        <button className="flex w-full items-center gap-3 border-t border-white/[0.06] p-4 text-left" onClick={() => onSettingsAction('settings')} type="button">
          <span className="material-symbols-outlined text-tw-loss">delete</span>
          <span className="flex-1"><span className="block text-sm text-tw-on-surface">Delete local wallet</span><span className="mt-1 block text-xs text-tw-on-surface-variant">Remove encrypted wallet data from this browser</span></span>
          <span className="material-symbols-outlined text-sm text-tw-on-surface-variant">chevron_right</span>
        </button>
      </div>
      <button className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-tw-surface-container-low p-4 text-left" onClick={onLockWallet} type="button">
        <span className="material-symbols-outlined text-tw-primary">lock</span>
        <span className="text-sm text-tw-on-surface">Lock wallet</span>
      </button>
      <p className="text-xs leading-5 text-tw-on-surface-variant">
        Currency preferences, themes, and biometric locking are not available yet.
      </p>
    </section>
  );
};

export default PrimaryTabContent;
