import React, { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TrustShield from '../components/common/TrustShield';
import TokenRow from '../components/assets/TokenRow';
import ChainAssetLogo, { ChainAssetLogoKind } from '../components/assets/ChainAssetLogo';
import QuickActionButtons from '../components/wallet/QuickActionButtons';
import PrimaryTabContent, { PrimaryTab } from '../components/wallet/PrimaryTabContent';
import { Token } from '../types';
import { WalletNetwork, useWalletSetup } from '../wallet/WalletSetupContext';
import { readNativeBalance, walletNetworks } from '../wallet/networks';
import { walletNetworkIds } from '../wallet/chainRegistry';
import {
  fetchMarketPrices,
  formatPriceChange,
  formatUsd,
  MarketCoinId,
  MarketPrices,
} from '../wallet/marketPrices';
import { Erc20TokenBalance, readTokenBalances } from '../wallet/tokenBalances';
import type { WalletNetwork as ChainId } from '../wallet/chainRegistry';
import { QRCodeSVG } from 'qrcode.react';
import { isValidRecipientAddress, readNetworkFee, validateNativeAmount } from '../wallet/sendSupport';
import type { NetworkFeeQuote } from '../wallet/sendSupport';
import { clearAccountSession, readAccountSession, saveAccountSession } from '../services/authSession';
import { isSessionIdle, markSessionActivity, readSessionActivity } from '../wallet/sessionUnlock';
import { saveAccountBalance } from '../services/authApi';
import { normalizeAccountBalance } from '../wallet/portfolioBalance';

const portfolioBalanceNetworks = walletNetworkIds.filter((id) => {
  const config = walletNetworks[id];
  return !config.testnet && (
    (config.family === 'evm' && Boolean(config.rpcUrl && config.chainId)) ||
    ['bitcoin', 'litecoin', 'dogecoin', 'bitcoinCash', 'zcash', 'solana', 'tron', 'xrp', 'cosmos', 'stellar', 'aptos', 'sui', 'near'].includes(id)
  );
});
const portfolioTokenNetworks = portfolioBalanceNetworks.filter(
  (id) => Boolean(walletNetworks[id].explorerApiUrl)
);

type ReceiveAsset = WalletNetwork | 'tether-ethereum' | 'tether-bnb' | 'tether-tron';

type PortfolioPanel =
  | 'send'
  | 'receive'
  | 'buy'
  | 'swap'
  | 'manage_tokens'
  | 'asset'
  | 'wallets'
  | 'scanner'
  | 'notifications'
  | 'security'
  | 'earn'
  | 'discover'
  | 'settings'
  | null;

const MainAssetsPortfolio: React.FC = () => {
  const navigate = useNavigate();
  const {
    address: walletAddress,
    receiveAddresses,
    network,
    selectNetwork,
    lockWithSessionPin,
    lockWithPassword,
    deleteVault,
  } = useWalletSetup();
  const [isPrivacyActive, setIsPrivacyActive] = useState(false);
  const [accountSession, setAccountSession] = useState(() => readAccountSession());
  const [accountBalance, setAccountBalance] = useState(() =>
    normalizeAccountBalance(readAccountSession()?.user.balance)
  );
  const [balanceDraft, setBalanceDraft] = useState('');
  const [accountBalanceError, setAccountBalanceError] = useState('');
  const [accountBalanceSaved, setAccountBalanceSaved] = useState(false);
  const [accountBalanceSaving, setAccountBalanceSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'crypto' | 'nfts'>('crypto');
  const [portfolioNetwork, setPortfolioNetwork] = useState<'all' | WalletNetwork>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePanel, setActivePanel] = useState<PortfolioPanel>(null);
  const [hiddenTokenIds, setHiddenTokenIds] = useState<string[]>([]);
  const [sendPreview, setSendPreview] = useState(false);
  const [sendValidationError, setSendValidationError] = useState('');
  const [networkFee, setNetworkFee] = useState<NetworkFeeQuote | null>(null);
  const [networkFeeError, setNetworkFeeError] = useState('');
  const [networkFeeLoading, setNetworkFeeLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [copiedAddress, setCopiedAddress] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Token | null>(null);
  const [assetDetailNetwork, setAssetDetailNetwork] = useState<WalletNetwork>('ethereum');
  const [activeNav, setActiveNav] = useState<PrimaryTab>('home');
  const [nativeBalance, setNativeBalance] = useState<string | null>('0');
  const [multiChainBalances, setMultiChainBalances] = useState<Partial<Record<ChainId, string>>>(() =>
    Object.fromEntries(portfolioBalanceNetworks.map((chain) => [chain, '0'])) as Partial<Record<ChainId, string>>
  );
  const [multiChainBalanceError, setMultiChainBalanceError] = useState('');
  const [multiChainBalancesLoading, setMultiChainBalancesLoading] = useState(false);
  const [balanceError, setBalanceError] = useState('');
  const [tokenBalances, setTokenBalances] = useState<Erc20TokenBalance[]>([]);
  const [multiChainTokenBalances, setMultiChainTokenBalances] = useState<Partial<Record<ChainId, Erc20TokenBalance[]>>>({});
  const multiChainTokenBalancesRef = React.useRef(multiChainTokenBalances);
  multiChainTokenBalancesRef.current = multiChainTokenBalances;
  const [tokenBalancesLoading, setTokenBalancesLoading] = useState(false);
  const [refreshSequence, setRefreshSequence] = useState(0);
  const [marketPrices, setMarketPrices] = useState<MarketPrices | null>(null);
  const [marketPriceError, setMarketPriceError] = useState('');
  const [marketPricesUpdatedAt, setMarketPricesUpdatedAt] = useState<number | null>(null);
  const [marketPricesLoading, setMarketPricesLoading] = useState(false);
  const [marketRefreshSequence, setMarketRefreshSequence] = useState(0);
  const [networkError, setNetworkError] = useState('');
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [networkSaving, setNetworkSaving] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deletingWallet, setDeletingWallet] = useState(false);
  const [receiveAsset, setReceiveAsset] = useState<ReceiveAsset>('ethereum');
  const hiddenBalance = '••••••••';

  const formatAssetAmount = (value: string): string => {
    const [whole, fraction = ''] = value.split('.');
    const visibleFraction = fraction.slice(0, 6).replace(/0+$/, '');
    if (whole === '0' && visibleFraction === '' && /[1-9]/.test(fraction)) {
      return '<0.000001';
    }
    return visibleFraction ? `${whole}.${visibleFraction}` : whole;
  };

  const isTestNetwork = walletNetworks[network].testnet === true;
  const activeAddressKey = walletNetworks[network].addressKey;
  const networkAddress = activeAddressKey
    ? receiveAddresses?.[activeAddressKey] || undefined
    : walletAddress || undefined;
  const nativeSymbol = walletNetworks[network].symbol;
  const portfolioTokenBalances = portfolioTokenNetworks.flatMap((chain) =>
    (multiChainTokenBalances[chain] || []).map((balance) => ({ chain, balance }))
  );
  const tokens: Token[] = [
    ...portfolioBalanceNetworks
      .filter((chain) => {
        const balance = chain === network ? nativeBalance ?? multiChainBalances[chain] : multiChainBalances[chain];
        // Bitcoin is the headline asset of this wallet, so it is always listed
        // even before it has a balance. Other chains stay hidden until funded.
        return chain === 'bitcoin' || chain === network || (balance !== undefined && Number(balance) > 0);
      })
      .map((chain) => {
        const config = walletNetworks[chain];
        const coinId = config.marketCoinId;
        const price = coinId ? marketPrices?.[coinId] : undefined;
        const balance = chain === network ? nativeBalance ?? multiChainBalances[chain] : multiChainBalances[chain];
        const isCurrentBalanceLoading = chain === network && balance === null && balanceLoading;
        const icon = chain === 'bitcoin' ? 'bitcoin'
          : chain === 'dogecoin' ? 'dogecoin'
            : chain === 'litecoin' ? 'litecoin'
              : chain === 'tron' ? 'tron'
                : chain === 'solana' ? 'solana'
                  : chain === 'xrp' ? 'ripple'
                    : chain === 'cosmos' ? 'cosmos'
                      : chain === 'bnb' ? 'bnb'
                        : 'ethereum';
        const color = chain === 'bnb' ? '#F3BA2F'
          : chain === 'bitcoin' ? '#F7931A'
            : chain === 'dogecoin' ? '#C2A633'
              : chain === 'litecoin' ? '#345D9D'
                : chain === 'tron' ? '#EF0027'
                  : chain === 'solana' ? '#9945FF'
                    : '#627EEA';
        return {
          id: `native-${chain}`,
          name: config.label,
          symbol: config.symbol,
          network: config.label,
          price: price ? formatUsd(price.usd) : marketPrices && coinId ? 'Price unavailable' : 'Loading price…',
          change: price?.usd24hChange !== null && price?.usd24hChange !== undefined
            ? formatPriceChange(price.usd24hChange)
            : '',
          changeType: price?.usd24hChange !== null && price?.usd24hChange !== undefined &&
            price.usd24hChange < 0 ? 'loss' as const : 'gain' as const,
          amount: balance !== null && balance !== undefined
            ? `${formatAssetAmount(balance)} ${config.symbol}`
            : isCurrentBalanceLoading
              ? 'Loading balance…'
              : 'Balance unavailable',
          fiatValue: balance !== null && balance !== undefined && price
            ? formatUsd(Number(balance) * price.usd)
            : isCurrentBalanceLoading || (!marketPrices && coinId) ? 'Loading…' : '—',
          icon,
          iconColor: color,
          glyphColor: chain === 'bnb' ? '#F3BA2F' : '#8DA0F5',
          badge: { label: config.symbol.slice(0, 1), color },
          isVerified: true,
        };
      }),
    ...portfolioTokenBalances.map(({ chain, balance }) => {
      const tokenValue = balance.priceUsd !== null
        ? Number(balance.balance) * balance.priceUsd
        : null;
      return {
        id: `${chain}:${balance.address.toLowerCase()}`,
        name: balance.name,
        symbol: balance.symbol,
        network: walletNetworks[chain].label,
        price: walletNetworks[chain].testnet
          ? 'Testnet'
          : balance.priceUsd !== null
            ? formatUsd(balance.priceUsd)
            : 'Price unavailable',
        change: '',
        changeType: 'gain' as const,
        amount: `${formatAssetAmount(balance.balance)} ${balance.symbol}`,
        fiatValue: walletNetworks[chain].testnet
          ? 'Testnet · no monetary value'
          : tokenValue !== null && Number.isFinite(tokenValue)
            ? formatUsd(tokenValue)
            : 'Price unavailable',
        icon: 'currency_exchange',
        iconColor: '#8DA0F5',
        isVerified: balance.isVerified,
      };
    }),
  ];

  const filteredTokens = tokens.filter((token) => {
    const matchesSearch =
      token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesNetwork = portfolioNetwork === 'all' ||
      token.network === walletNetworks[portfolioNetwork].label;
    return !hiddenTokenIds.includes(token.id) && matchesSearch && matchesNetwork;
  });

  useEffect(() => {
    setNativeBalance('0');
    setBalanceError('');
    if (!networkAddress) {
      setBalanceLoading(false);
      return undefined;
    }
    let active = true;
    setBalanceLoading(true);
    setBalanceError('');
    const loadBalance = async () => {
      try {
        const balance = await readNativeBalance(networkAddress, network);
        if (active) {
          setNativeBalance(balance);
          setBalanceError('');
        }
      } catch {
        if (active) {
          setNativeBalance(null);
          setBalanceError('Could not load your balance. Check your connection and try again.');
        }
      } finally {
        if (active) setBalanceLoading(false);
      }
    };
    void loadBalance();
    const intervalId = window.setInterval(() => { void loadBalance(); }, 30_000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [networkAddress, network, refreshSequence]);

  useEffect(() => {
    let active = true;
    let timeoutId: number;
    if (!walletAddress) {
      setMultiChainBalances({});
      setMultiChainBalanceError('');
      setMultiChainBalancesLoading(false);
      return () => {
        active = false;
      };
    }
    const loadBalances = async () => {
      setMultiChainBalancesLoading(true);
      setMultiChainBalances(Object.fromEntries(
        portfolioBalanceNetworks.map((chain) => [chain, '0'])
      ));
      const entries: Array<{ chain: ChainId; balance: string | null }> = [];
      for (let index = 0; index < portfolioBalanceNetworks.length; index += 5) {
        const batch = portfolioBalanceNetworks.slice(index, index + 5);
        const batchEntries = await Promise.all(batch.map(async (chain) => {
          const addressKey = walletNetworks[chain].addressKey;
          const address = addressKey ? receiveAddresses?.[addressKey] : walletAddress;
          if (!address) return { chain, balance: null };
          try {
            const balance = await readNativeBalance(address, chain);
            return { chain, balance };
          } catch {
            return { chain, balance: null };
          }
        }));
        entries.push(...batchEntries);
        if (!active) return;
        const partial: Partial<Record<ChainId, string>> = {};
        entries.forEach(({ chain, balance }) => {
          if (balance !== null) partial[chain] = balance;
        });
        setMultiChainBalances(partial);
      }
      if (!active) return;
      const balances: Partial<Record<ChainId, string>> = {};
      entries.forEach(({ chain, balance }) => {
        if (balance !== null) balances[chain] = balance;
      });
      setMultiChainBalances(balances);
      const failures = entries.filter(({ balance }) => balance === null).length;
      setMultiChainBalanceError(failures
        ? `Balances are unavailable for ${failures} network${failures === 1 ? '' : 's'}. Pull to refresh and try again.`
        : '');
      setMultiChainBalancesLoading(false);
      timeoutId = window.setTimeout(() => { void loadBalances(); }, 120_000);
    };
    void loadBalances();
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [walletAddress, receiveAddresses, refreshSequence]);

  useEffect(() => {
    if (activePanel !== 'send' || sendPreview) return undefined;
    let active = true;
    setNetworkFee(null);
    setNetworkFeeError('');
    setNetworkFeeLoading(true);
    readNetworkFee(network)
      .then((quote) => {
        if (active) setNetworkFee(quote);
      })
      .catch((error: unknown) => {
        if (active) {
          setNetworkFeeError(error instanceof Error ? error.message : 'Live network fee is unavailable.');
        }
      })
      .finally(() => {
        if (active) setNetworkFeeLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activePanel, network, sendPreview]);

  useEffect(() => {
    if (!walletAddress) {
      setTokenBalances([]);
      setMultiChainTokenBalances({});
      setTokenBalancesLoading(false);
      return undefined;
    }
    let active = true;
    let timeoutId: number;
    const loadTokenBalances = async () => {
      setTokenBalancesLoading(true);
      const results = await Promise.all(portfolioTokenNetworks.map(async (chain) => {
        const addressKey = walletNetworks[chain].addressKey;
        const address = addressKey ? receiveAddresses?.[addressKey] : walletAddress;
        if (!address) return { chain, balances: [], error: true };
        try {
          return { chain, balances: await readTokenBalances(address, chain), error: false };
        } catch {
          return { chain, balances: [], error: true };
        }
      }));
      if (!active) return;
      const balances: Partial<Record<ChainId, Erc20TokenBalance[]>> = {};
      results.forEach(({ chain, balances: chainBalances }) => {
        balances[chain] = chainBalances;
      });
      setMultiChainTokenBalances(balances);
      setTokenBalances(balances[network] || []);
      setTokenBalancesLoading(false);
      timeoutId = window.setTimeout(() => { void loadTokenBalances(); }, 60_000);
    };

    setTokenBalances(multiChainTokenBalancesRef.current[network] || []);
    void loadTokenBalances();
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [walletAddress, receiveAddresses, network, refreshSequence]);

  useEffect(() => {
    let active = true;
    let timeoutId: number;
    setMarketPrices(null);
    setMarketPricesUpdatedAt(null);
    setMarketPriceError('');
    setMarketPricesLoading(true);
    const loadPrices = async () => {
      try {
        const priceIds = Array.from(new Set(
          walletNetworkIds
            .map((chain) => walletNetworks[chain].marketCoinId)
            .filter((coinId): coinId is MarketCoinId => Boolean(coinId))
        ));
        const prices = await fetchMarketPrices(priceIds);
        if (active) {
          setMarketPrices(prices);
          setMarketPriceError('');
          setMarketPricesUpdatedAt(Date.now());
        }
      } catch {
        if (active) {
          setMarketPrices(null);
          setMarketPriceError('Live market prices could not be loaded.');
        }
      } finally {
        if (active) setMarketPricesLoading(false);
      }

      if (active) timeoutId = window.setTimeout(() => { void loadPrices(); }, 60_000);
    };

    void loadPrices();
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [marketRefreshSequence]);

  const togglePrivacy = () => {
    setIsPrivacyActive(!isPrivacyActive);
  };

  const handleTabChange = (tab: 'crypto' | 'nfts') => {
    setActiveTab(tab);
  };

  const handleAction = (action: Exclude<PortfolioPanel, null>) => {
    setActivePanel(action);
    setSendPreview(false);
    setSendValidationError('');
    setCopyFeedback('');
  };

  const closePanel = () => {
    setActivePanel(null);
    setSendPreview(false);
    setSendValidationError('');
    setCopyFeedback('');
  };

  useEffect(() => {
    if (!activePanel) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePanel();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [activePanel]);

  // The account is the source of truth for the balance, so an amount saved on
  // another device is picked up as soon as the session is restored.
  useEffect(() => {
    if (!accountSession) return;
    setAccountBalance(normalizeAccountBalance(accountSession.user.balance));
  }, [accountSession]);

  const handleSendPreview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidRecipientAddress(recipientAddress, network)) {
      setSendValidationError(`Enter a valid ${walletNetworks[network].label} address to continue.`);
      return;
    }
    if (!validateNativeAmount(sendAmount)) {
      setSendValidationError(`Enter a valid amount greater than zero ${walletNetworks[network].symbol}.`);
      return;
    }
    setSendValidationError('');
    setSendPreview(true);
  };

  const logoByNetwork: Partial<Record<WalletNetwork, ChainAssetLogoKind>> = {
    bitcoin: 'bitcoin',
    tron: 'tron',
    solana: 'solana',
    dogecoin: 'dogecoin',
    litecoin: 'litecoin',
    xrp: 'ripple',
    cosmos: 'cosmos',
  };
  const receiveAssetOptions: Array<{
    id: ReceiveAsset;
    symbol: string;
    chain: string;
    logo?: ChainAssetLogoKind;
    tint: string;
  }> = [
    ...walletNetworkIds.map((id) => ({
      id,
      symbol: walletNetworks[id].symbol,
      chain: walletNetworks[id].label,
      logo: logoByNetwork[id],
      tint: '#627EEA',
    })),
    { id: 'tether-ethereum', symbol: 'USDT', chain: 'Ethereum', logo: 'tether', tint: '#26A17B' },
    { id: 'tether-bnb', symbol: 'USDT', chain: 'BNB Chain', logo: 'tether', tint: '#26A17B' },
    { id: 'tether-tron', symbol: 'USDT', chain: 'TRON', logo: 'tether', tint: '#26A17B' },
  ];
  const getReceiveAddress = (asset: ReceiveAsset): string | undefined => {
    if (asset === 'tether-ethereum' || asset === 'tether-bnb') {
      return receiveAddresses?.ethereum || walletAddress || undefined;
    }
    if (asset === 'tether-tron') return receiveAddresses?.tron || undefined;
    const config = walletNetworks[asset];
    if (config.addressKey && receiveAddresses?.[config.addressKey]) {
      return receiveAddresses[config.addressKey];
    }
    return config.family === 'evm' ? walletAddress || undefined : undefined;
  };
  const selectedReceiveAsset = receiveAssetOptions.find((asset) => asset.id === receiveAsset);
  const selectedReceiveAddress = getReceiveAddress(receiveAsset);
  const assetDetailAddress = getReceiveAddress(assetDetailNetwork);
  const bitcoinAddress = receiveAddresses?.bitcoin || undefined;

  const recipientAddressWarning = (() => {
    const candidate = recipientAddress.trim();
    if (!candidate) return '';
    if (isValidRecipientAddress(candidate, network)) return '';
    return 'This does not look like a valid address for the selected network. Double-check it before continuing.';
  })();

  const copyAddress = async (addressToCopy: string | undefined) => {
    if (!addressToCopy) {
      setCopyFeedback('This network address is unavailable for the current wallet.');
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(addressToCopy);
      } else {
        const temporaryInput = document.createElement('textarea');
        temporaryInput.value = addressToCopy;
        temporaryInput.setAttribute('readonly', 'true');
        temporaryInput.style.position = 'fixed';
        temporaryInput.style.opacity = '0';
        document.body.appendChild(temporaryInput);
        temporaryInput.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(temporaryInput);
        if (!copied) throw new Error('Clipboard access is unavailable.');
      }
      setCopiedAddress(addressToCopy);
      setCopyFeedback('Copied!');
      window.setTimeout(() => setCopyFeedback(''), 2500);
    } catch {
      setCopyFeedback('Unable to copy. Select and copy the address instead.');
    }
  };

  const handleNetworkChange = async (selected: WalletNetwork) => {
    setNetworkError('');
    setNetworkSaving(true);
    try {
      await selectNetwork(selected);
    } catch (error) {
      setNetworkError(error instanceof Error ? error.message : 'Could not save network selection.');
    } finally {
      setNetworkSaving(false);
    }
  };

  const handleLockWallet = () => {
    // Fall back to a full password lock for vaults created before the
    // six-digit code existed.
    if (!lockWithSessionPin()) lockWithPassword();
    navigate('/passcode', { replace: true });
  };

  // The session expires after three minutes without interaction: the wallet
  // locks itself and the owner signs in again with the six-digit code.
  useEffect(() => {
    const lockIfIdle = () => {
      if (!isSessionIdle()) return;
      if (!lockWithSessionPin()) lockWithPassword();
      navigate('/passcode', { replace: true });
    };

    const recordActivity = () => markSessionActivity();
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, recordActivity, { passive: true }));
    // Reaching the portfolio means the owner just signed in, so start the idle
    // clock here when nothing has been recorded for this tab yet.
    if (readSessionActivity() === null) markSessionActivity();
    const intervalId = window.setInterval(lockIfIdle, 15_000);
    lockIfIdle();

    return () => {
      events.forEach((event) => window.removeEventListener(event, recordActivity));
      window.clearInterval(intervalId);
    };
  }, [lockWithSessionPin, lockWithPassword, navigate]);

  const handleSignOutAccount = () => {
    clearAccountSession();
    setAccountSession(null);
    lockWithPassword();
    navigate('/account', { replace: true });
  };

  // Creating a wallet creates the account that owns it, so this is the way to
  // start a second account from inside the wallet.
  const handleCreateAccount = () => {
    clearAccountSession();
    setAccountSession(null);
    lockWithPassword();
    navigate('/create-account', { replace: true });
  };

  const handleDeleteWallet = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDeleteError('');
    setDeletingWallet(true);
    try {
      await deleteVault(deletePassword);
      setDeletePassword('');
      navigate('/onboarding', { replace: true });
    } catch (error) {
      setDeleteError(error instanceof Error && error.message.toLowerCase().includes('incorrect password')
        ? 'Wallet password is incorrect.'
        : error instanceof Error ? error.message : 'Wallet could not be deleted.');
    } finally {
      setDeletingWallet(false);
    }
  };

  const formattedBalance = nativeBalance
    ? `${nativeBalance.split('.')[0]}.${(nativeBalance.split('.')[1] ?? '').slice(0, 6).padEnd(6, '0')}`
    : null;
  const portfolioValue = portfolioBalanceNetworks.reduce((total, chain) => {
    const balance = multiChainBalances[chain] ?? (chain === network ? nativeBalance : undefined);
    const coinId = walletNetworks[chain].marketCoinId;
    const quote = coinId ? marketPrices?.[coinId] : undefined;
    return balance !== undefined && quote ? total + Number(balance) * quote.usd : total;
  }, 0) + portfolioTokenBalances.reduce((total, { balance }) => {
    return total + (balance.priceUsd !== null
      ? Number(balance.balance) * balance.priceUsd
      : 0);
  }, 0);
  const formattedPortfolioValue = Number.isFinite(portfolioValue)
    ? formatUsd(portfolioValue)
    : null;
  const unpricedTokenCount = portfolioTokenBalances.filter(({ balance }) => balance.priceUsd === null).length;

  // The headline balance is the amount stored on the account plus whatever the
  // wallet really holds.
  const headlineValue = accountBalance + (Number.isFinite(portfolioValue) ? portfolioValue : 0);
  const formattedHeadlineValue = formatUsd(headlineValue);

  const applyAccountBalance = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(balanceDraft);
    if (balanceDraft.trim() === '' || !Number.isFinite(amount) || amount < 0) {
      setAccountBalanceError('Enter an amount of 0 or more.');
      setAccountBalanceSaved(false);
      return;
    }
    setAccountBalanceError('');
    setAccountBalance(amount);
    setBalanceDraft('');
    setAccountBalanceSaved(true);
    if (!accountSession) return;
    setAccountBalanceSaving(true);
    try {
      const user = await saveAccountBalance(accountSession.token, amount);
      const session = { token: accountSession.token, user };
      saveAccountSession(session);
      setAccountSession(session);
    } catch {
      // The balance already shows the new amount locally; the account copy can
      // be retried on the next change.
    } finally {
      setAccountBalanceSaving(false);
    }
  };

  const toggleTokenVisibility = (tokenId: string) => {
    setHiddenTokenIds((hidden) =>
      hidden.includes(tokenId)
        ? hidden.filter((id) => id !== tokenId)
        : [...hidden, tokenId]
    );
  };

  return (
    <div className="bg-tw-surface min-h-screen flex flex-col overflow-x-hidden pt-safe pb-safe font-sans text-tw-on-surface antialiased selection:bg-tw-primary selection:text-tw-on-primary">
      {/* Top App Header */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-tw-surface/85 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="h-16 px-4 flex items-center justify-between">
          {/* Left: Trust Shield & Wallet Switcher */}
          <div className="flex min-w-0 items-center gap-2">
            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-tw-primary-variant/20 to-tw-primary/10 p-0.5 border border-tw-primary/30">
              <TrustShield className="h-4 w-4 text-tw-primary drop-shadow-[0_0_8px_rgba(61,90,254,0.35)]" />
            </div>
            {/* Wallet Selector Pill */}
            <button
              aria-label={`Wallet: ${accountSession?.user.name ? `${accountSession.user.name}'s wallet` : 'Main Wallet 1'}. Change network`}
              className="flex shrink-0 items-center gap-1.5 bg-tw-surface-container/90 hover:bg-tw-surface-container-high active:scale-95 transition-all py-1.5 px-2.5 rounded-full border border-white/[0.06]"
              onClick={() => handleAction('wallets')}
            >
              <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-tw-primary shadow-[0_0_8px_#3D5AFE] animate-pulse"></span>
              <span className="max-w-[9rem] truncate whitespace-nowrap font-display font-medium text-[12px] text-tw-on-surface tracking-tight">
                {accountSession?.user.name ? `${accountSession.user.name}'s wallet` : 'Main Wallet 1'}
              </span>
              <span className="material-symbols-outlined text-[16px] text-tw-on-surface-variant">
                expand_more
              </span>
            </button>
          </div>
          {/* Right Action Icons */}
          <div className="flex shrink-0 items-center gap-0.5">
            <button 
              aria-label="QR Code Scanner" 
              className="w-8 h-8 flex items-center justify-center text-tw-on-surface-variant hover:text-tw-on-surface hover:bg-white/5 active:scale-95 rounded-full transition-all"
              onClick={() => handleAction('scanner')}
            >
              <span className="material-symbols-outlined text-[20px]">
                qr_code_scanner
              </span>
            </button>
            <button 
              aria-label="Transaction Notifications" 
              className="relative w-8 h-8 flex items-center justify-center text-tw-on-surface-variant hover:text-tw-on-surface hover:bg-white/5 active:scale-95 rounded-full transition-all"
              onClick={() => handleAction('notifications')}
            >
              <span className="material-symbols-outlined text-[20px]">
                notifications
              </span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-tw-primary ring-2 ring-tw-surface"></span>
            </button>
            <button 
              aria-label="Lock wallet" 
              className="w-8 h-8 flex items-center justify-center text-tw-primary/90 hover:text-tw-primary hover:bg-tw-primary/10 active:scale-95 rounded-full transition-all"
              onClick={handleLockWallet}
            >
              <span className="material-symbols-outlined text-[20px]">
                lock
              </span>
            </button>
            <button
              aria-label="Create a new account"
              className="w-8 h-8 flex items-center justify-center text-tw-on-surface-variant hover:text-tw-on-surface hover:bg-white/5 active:scale-95 rounded-full transition-all"
              onClick={handleCreateAccount}
              title="Create a new account"
            >
              <span className="material-symbols-outlined text-[20px]">
                person_add
              </span>
            </button>
            {accountSession && (
              <button
                aria-label={`Sign out of ${accountSession.user.name || 'this wallet'}`}
                className="w-8 h-8 flex items-center justify-center text-tw-on-surface-variant hover:text-tw-on-surface hover:bg-white/5 active:scale-95 rounded-full transition-all"
                onClick={handleSignOutAccount}
                title={`Signed in as ${accountSession.user.name || 'this wallet'}`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  logout
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Scrollable Body Area */}
      <main className="flex-1 flex flex-col relative w-full pt-20 pb-28 bg-tw-surface">
        {activeNav === 'home' ? (
        <div className="flex flex-col w-full px-4 gap-5 select-none max-w-md mx-auto">
          {/* Redesigned Trust Wallet Portfolio Card */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-tw-surface-container-low to-[#0E121B] p-4 shadow-2xl border border-white/[0.06]">
            {/* Subtle blue ambient glow */}
            <div className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full bg-tw-primary/15 blur-3xl"></div>
            <div className="pointer-events-none absolute -left-12 -bottom-16 h-48 w-48 rounded-full bg-tw-primary/10 blur-2xl"></div>
            
            <div className="relative z-10 flex flex-col gap-3">
              {/* Top Row: Label & Eye Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-medium text-[11px] tracking-wide uppercase text-tw-on-surface-variant">
                    {portfolioNetwork === 'all' ? 'All Networks' : walletNetworks[portfolioNetwork].label}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-[0.25rem] text-[9px] font-medium font-display bg-tw-primary/10 text-tw-primary border border-tw-primary/20">
                    LIVE
                  </span>
                </div>
                <button 
                  aria-label="Toggle Balance Visibility" 
                  className="p-1 rounded-full text-tw-on-surface-variant hover:text-tw-on-surface active:scale-90 transition-all"
                  id="toggle-privacy"
                  onClick={togglePrivacy}
                >
                  <span className="material-symbols-outlined text-[20px]" id="privacy-icon">
                    {isPrivacyActive ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              {/* Total Balance Display */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline gap-2">
                  <span 
                    className="font-display font-medium text-[24px] tracking-tight text-tw-on-surface leading-none"
                    id="portfolio-balance"
                  >
                    {isPrivacyActive
                      ? hiddenBalance
                      : formattedHeadlineValue}
                  </span>
                  <span className="font-display font-normal text-[11px] text-tw-on-surface-variant">
                    USD
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span aria-live="polite" className={`text-[11px] ${balanceError || multiChainBalanceError ? 'text-tw-loss' : 'text-tw-on-surface-variant'}`}>
                    {balanceError || multiChainBalanceError || (network === 'bnb'
                      ? 'Native BNB balance · included in All Networks total'
                      : unpricedTokenCount > 0
                        ? `Known market value · ${unpricedTokenCount} token${unpricedTokenCount === 1 ? '' : 's'} missing a price`
                        : 'Wallet value · balances and prices across your networks')}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-tw-on-surface-variant">
                    {`Account balance ${formatUsd(accountBalance)} · live wallet value ${formattedPortfolioValue ?? '—'}`}
                  </span>
                </div>
                {isTestNetwork && formattedBalance && (
                  <span className="text-[10px] text-tw-on-surface-variant">
                    {`${walletNetworks[network].label} testnet: ${formattedBalance} ${nativeSymbol} (not included)`}
                  </span>
                )}
              </div>

              {/* Quick Action Buttons Row */}
              <QuickActionButtons onAction={handleAction} />
            </div>
          </section>

          {/* Category Filter Tabs & Filter Icon */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              {/* Segmented Tab Controls */}
              <div className="flex items-center gap-5">
                <button 
                  className={`relative pb-2 font-display text-[13px] font-medium transition-colors ${
                    activeTab === 'crypto' ? 'text-tw-on-surface' : 'text-tw-on-surface-variant hover:text-tw-on-surface'
                  }`}
                  id="tab-crypto"
                  onClick={() => handleTabChange('crypto')}
                >
                  Crypto
                  <span 
                    className={`absolute bottom-0 left-0 h-[3px] w-full bg-tw-primary rounded-full transition-all duration-200 ${
                      activeTab === 'crypto' ? '' : 'opacity-0'
                    }`}
                    id="tab-crypto-indicator"
                  ></span>
                </button>
                <button 
                  className={`relative pb-2 font-display text-[13px] font-medium transition-colors ${
                    activeTab === 'nfts' ? 'text-tw-on-surface' : 'text-tw-on-surface-variant hover:text-tw-on-surface'
                  }`}
                  id="tab-nfts"
                  onClick={() => handleTabChange('nfts')}
                >
                  NFTs
                  <span 
                    className={`absolute bottom-0 left-0 h-[3px] w-full bg-tw-primary rounded-full opacity-0 transition-all duration-200 ${
                      activeTab === 'nfts' ? 'opacity-100' : ''
                    }`}
                    id="tab-nfts-indicator"
                  ></span>
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  aria-label="Refresh wallet balances"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.04] text-tw-on-surface-variant hover:text-tw-primary active:scale-95 transition-all disabled:opacity-40"
                  disabled={balanceLoading || tokenBalancesLoading || multiChainBalancesLoading || marketPricesLoading}
                  onClick={() => {
                    setRefreshSequence((sequence) => sequence + 1);
                    setMarketRefreshSequence((sequence) => sequence + 1);
                  }}
                  title="Refresh wallet balances and prices"
                  type="button"
                >
                  <span className={`material-symbols-outlined text-[19px] ${balanceLoading || tokenBalancesLoading || multiChainBalancesLoading || marketPricesLoading ? 'animate-spin' : ''}`}>
                    refresh
                  </span>
                </button>
                <button 
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.04] text-tw-on-surface-variant hover:text-tw-primary active:scale-95 transition-all" 
                  title="Manage Token Visibility"
                  aria-label="Manage token visibility"
                  onClick={() => handleAction('manage_tokens')}
                >
                  <span className="material-symbols-outlined text-[19px]">
                    tune
                  </span>
                </button>
              </div>
            </div>
            {/* Token Search Bar */}
            <div className="relative flex items-center w-full">
              <span className="material-symbols-outlined absolute left-3.5 text-[18px] text-tw-on-surface-variant pointer-events-none">
                search
              </span>
              <input 
                aria-label="Search tokens or address"
                className="w-full h-10 pl-10 pr-4 rounded-[0.75rem] bg-tw-surface-container-low border border-white/[0.06] text-tw-on-surface placeholder:text-tw-on-surface-variant text-[13px] focus:outline-none focus:border-tw-primary/50 focus:ring-1 focus:ring-tw-primary/40 transition-all"
                id="token-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tokens or address"
                type="text"
              />
            </div>
          </section>

          <section aria-label="Portfolio network filter" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max min-w-full gap-2">
              <button
                aria-pressed={portfolioNetwork === 'all'}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs transition-colors ${
                  portfolioNetwork === 'all'
                    ? 'border-tw-primary bg-tw-primary/15 text-tw-primary'
                    : 'border-white/[0.08] bg-tw-surface-container-low text-tw-on-surface-variant'
                }`}
                onClick={() => setPortfolioNetwork('all')}
                type="button"
              >
                All Networks
              </button>
              {portfolioBalanceNetworks.map((networkId) => (
                <button
                  aria-pressed={portfolioNetwork === networkId}
                  className={`shrink-0 rounded-full border px-4 py-2 text-xs transition-colors ${
                    portfolioNetwork === networkId
                      ? 'border-tw-primary bg-tw-primary/15 text-tw-primary'
                      : 'border-white/[0.08] bg-tw-surface-container-low text-tw-on-surface-variant'
                  }`}
                  key={networkId}
                  onClick={() => setPortfolioNetwork(networkId)}
                  type="button"
                >
                  {walletNetworks[networkId].label}
                </button>
              ))}
            </div>
          </section>

          {/* Network asset balances */}
          <section className="flex flex-col gap-2" id="crypto-list-container">
            {activeTab === 'crypto' && (
              <p className="text-[11px] leading-4 text-tw-on-surface-variant">
                Balances are combined across every network you have added. Token lists and prices vary by network.
              </p>
            )}
            {activeTab === 'crypto' && (
              <p aria-live="polite" className={`text-[11px] leading-4 ${marketPriceError ? 'text-tw-loss' : 'text-tw-on-surface-variant'}`}>
                {marketPriceError || (marketPricesUpdatedAt
                  ? `Prices updated ${new Date(marketPricesUpdatedAt).toLocaleTimeString()} · refreshes every minute`
                  : marketPricesLoading ? 'Loading prices…' : 'Prices are not available right now. Pull to refresh and try again.')}
              </p>
            )}
            {activeTab === 'crypto' && tokenBalancesLoading && (
              <p className="text-[11px] leading-4 text-tw-on-surface-variant">Checking token balances…</p>
            )}
            {activeTab === 'crypto' && portfolioNetwork === network && walletNetworks[network].explorerApiUrl && !tokenBalancesLoading && tokenBalances.length === 0 && (
              <p className="text-[11px] leading-4 text-tw-on-surface-variant">
                No ERC-20 tokens with a positive balance were found on this network.
              </p>
            )}
            {activeTab === 'crypto' && (
              <p className="text-[10px] leading-4 text-tw-on-surface-variant">
                Prices and 24-hour changes refresh about once per minute and may be delayed. Unverified tokens can be spam — never follow token links or share your recovery phrase.
              </p>
            )}
            {activeTab === 'crypto' && (
              filteredTokens.length > 0 ? (
                filteredTokens.map((token) => (
                  <TokenRow
                    key={token.id}
                    onClick={() => {
                      const tokenNetwork = walletNetworkIds.find(
                        (id) => walletNetworks[id].label === token.network
                      ) || network;
                      setSelectedAsset(token);
                      setAssetDetailNetwork(tokenNetwork);
                      handleAction('asset');
                    }}
                    token={token}
                  />
                ))
              ) : multiChainBalancesLoading ? (
                <div aria-label="Loading portfolio assets" className="space-y-2" role="status">
                  {[0, 1, 2, 3].map((item) => (
                    <div className="h-[68px] animate-pulse rounded-2xl border border-white/[0.04] bg-tw-surface-container-low/80" key={item} />
                  ))}
                  <span className="sr-only">Loading balances across supported networks</span>
                </div>
              ) : (
                <div className="text-center py-8 text-tw-on-surface-variant">
                  No tokens found
                </div>
              )
            )}
            {activeTab === 'crypto' && (
              <section aria-label="Receive on other networks" className="mt-3 space-y-2">
                <div>
                  <h2 className="text-sm font-medium text-tw-on-surface">Receive on other networks</h2>
                  <p className="mt-1 text-[11px] leading-4 text-tw-on-surface-variant">
                    Choose an asset to view and copy its matching address.
                  </p>
                </div>
                <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
                  {receiveAssetOptions.filter((asset) => asset.id !== 'sepolia').map((asset) => (
                    <button
                      aria-label={`Receive ${asset.symbol} on ${asset.chain}`}
                      className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-tw-surface-container-low px-3 py-2 text-left transition-colors hover:border-tw-primary/40"
                      key={asset.id}
                      onClick={() => {
                        setReceiveAsset(asset.id);
                        handleAction('receive');
                      }}
                      type="button"
                    >
                      {asset.logo ? (
                        <ChainAssetLogo className="h-8 w-8 shrink-0" kind={asset.logo} />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                          style={{ backgroundColor: `${asset.tint}22`, color: asset.tint }}
                        >
                          {asset.symbol === 'ETH' ? 'Ξ' : asset.symbol.slice(0, 1)}
                        </span>
                      )}
                      <span className="flex min-w-0 flex-col">
                        <span className="text-xs font-medium text-tw-on-surface">{asset.symbol}</span>
                        <span className="text-[10px] text-tw-on-surface-variant">{asset.chain}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            
            {activeTab === 'nfts' && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl bg-tw-surface-container-low/50 border border-white/[0.04]" id="nfts-list-container">
                <div className="h-16 w-16 rounded-full bg-tw-surface-container-high flex items-center justify-center mb-3 text-tw-primary">
                  <span className="material-symbols-outlined text-[32px]">
                    photo_library
                  </span>
                </div>
                <span className="font-display font-medium text-[14px] text-tw-on-surface">
                  No Collectibles Found
                </span>
                <p className="text-[12px] text-tw-on-surface-variant mt-1 max-w-[240px]">
                  Receive or buy an NFT on Ethereum, Solana, or BNB Chain to display here.
                </p>
                <button
                  className="mt-4 rounded-full bg-tw-primary/15 border border-tw-primary/30 px-5 py-2 font-display text-[12px] font-medium text-tw-primary hover:bg-tw-primary/25 transition-all"
                  onClick={() => handleAction('receive')}
                >
                  Receive NFT
                </button>
              </div>
            )}
          </section>

          {/* Manage & Add Tokens Button */}
          <section className="flex justify-center pt-1 pb-4">
            <button 
              className="inline-flex items-center gap-2 rounded-full bg-tw-surface-container border border-white/[0.08] hover:border-tw-primary/40 px-6 py-3 text-tw-on-surface hover:text-tw-primary active:scale-95 transition-all shadow-lg"
              onClick={() => handleAction('manage_tokens')}
            >
              <span className="material-symbols-outlined text-[19px] text-tw-primary">
                tune
              </span>
              <span className="font-display text-[13px] font-medium">
                Manage Tokens
              </span>
            </button>
          </section>
        </div>
        ) : (
          <div className="flex w-full flex-col px-4 py-2 max-w-md mx-auto">
            <PrimaryTabContent
              tab={activeNav}
              nativeSymbol={nativeSymbol}
              assetSymbols={tokens.map((token) => token.symbol)}
              onSettingsAction={handleAction}
              onLockWallet={handleLockWallet}
            />
          </div>
        )}
      </main>

      {/* Trust Wallet navigation bar */}
      <nav className="fixed bottom-0 w-full z-50 pb-safe bg-tw-surface/90 backdrop-blur-xl border-t border-white/[0.06] shadow-[0_-8px_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
          <button 
            aria-current={activeNav === 'home' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${activeNav === 'home' ? 'text-tw-primary' : 'text-tw-on-surface-variant hover:text-tw-on-surface'}`}
            data-path="home" 
            onClick={() => { setActiveNav('home'); setActivePanel(null); }}
          >
            <div className="relative flex items-center justify-center">
              <span className="material-symbols-outlined text-[23px] font-semibold">
                account_balance_wallet
              </span>
              {activeNav === 'home' && <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-tw-primary shadow-[0_0_6px_#3D5AFE]"></span>}
            </div>
            <span className="font-display text-[10px] font-medium tracking-tight">
              Home
            </span>
          </button>
          <button 
            aria-current={activeNav === 'swap' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${activeNav === 'swap' ? 'text-tw-primary' : 'text-tw-on-surface-variant hover:text-tw-on-surface'}`}
            data-path="swap"
            onClick={() => { setActiveNav('swap'); setActivePanel(null); }}
          >
            <span className="material-symbols-outlined text-[23px]">
              swap_horiz
            </span>
            <span className="font-display text-[10px] font-medium tracking-tight">
              Swap
            </span>
          </button>
          <button 
            aria-current={activeNav === 'explore' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${activeNav === 'explore' ? 'text-tw-primary' : 'text-tw-on-surface-variant hover:text-tw-on-surface'}`}
            data-path="explore"
            onClick={() => { setActiveNav('explore'); setActivePanel(null); }}
          >
            <span className="material-symbols-outlined text-[23px]">
              explore
            </span>
            <span className="font-display text-[10px] font-medium tracking-tight">
              Explore
            </span>
          </button>
          <button 
            aria-current={activeNav === 'settings' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${activeNav === 'settings' ? 'text-tw-primary' : 'text-tw-on-surface-variant hover:text-tw-on-surface'}`}
            data-path="settings"
            onClick={() => { setActiveNav('settings'); setActivePanel(null); }}
          >
            <span className="material-symbols-outlined text-[23px]">
              settings
            </span>
            <span className="font-display text-[10px] font-medium tracking-tight">
              Settings
            </span>
          </button>
        </div>
      </nav>

      {activePanel && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePanel();
          }}
        >
          <section
            aria-labelledby="portfolio-panel-title"
            aria-modal="true"
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/[0.08] bg-tw-surface p-5 pb-safe shadow-2xl sm:rounded-3xl"
            role="dialog"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-base font-medium" id="portfolio-panel-title">
                {activePanel === 'manage_tokens' ? 'Manage tokens' :
                  activePanel === 'asset' ? selectedAsset?.name || 'Asset details' :
                  activePanel === 'wallets' ? 'Choose wallet' :
                  activePanel === 'scanner' ? 'Scan QR code' :
                  activePanel === 'notifications' ? 'Notifications' :
                  activePanel === 'security' ? 'Security' :
                  activePanel === 'earn' ? 'Earn' :
                  activePanel === 'discover' ? 'Discover' :
                  activePanel === 'settings' ? 'Settings' :
                  activePanel.charAt(0).toUpperCase() + activePanel.slice(1)}
              </h2>
              <button
                aria-label="Close panel"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-tw-on-surface-variant"
                onClick={closePanel}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {activePanel === 'wallets' && (
              <div className="space-y-2">
                {accountSession && (
                  <div className="mb-3 flex items-center gap-3 rounded-2xl bg-tw-surface-container-low p-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tw-primary/15 font-display text-base font-semibold text-tw-primary">
                      {(accountSession.user.name || 'W').slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-medium text-tw-on-surface">
                        {accountSession.user.name || 'Wallet owner'}
                      </p>
                      <p className="truncate text-xs text-tw-on-surface-variant">
                        {walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : 'Wallet account'}
                      </p>
                    </div>
                    <span className="ml-auto shrink-0 rounded-full border border-tw-primary/20 bg-tw-primary/10 px-2 py-0.5 text-[10px] font-medium text-tw-primary">
                      {accountSession.user.hasPin ? 'Code sign-in' : 'Password sign-in'}
                    </span>
                  </div>
                )}
                {walletAddress && (
                  <div className="mb-3 rounded-2xl bg-tw-surface-container-low p-4">
                    <p className="text-xs text-tw-on-surface-variant">Wallet address</p>
                    <code className="mt-1 block break-all text-xs">{walletAddress}</code>
                  </div>
                )}
                <p className="text-sm text-tw-on-surface-variant">Active network context for send and receive actions</p>
                <div aria-label="Active network" className="max-h-72 space-y-2 overflow-y-auto" role="group">
                  {walletNetworkIds.map((networkId) => (
                    <button
                      aria-pressed={network === networkId}
                      className={`flex min-h-14 w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                        network === networkId
                          ? 'border-tw-primary/50 bg-tw-primary/10 text-tw-on-surface'
                          : 'border-white/[0.06] bg-tw-surface-container-low text-tw-on-surface-variant hover:border-tw-primary/30'
                      }`}
                      key={networkId}
                      onClick={() => void handleNetworkChange(networkId)}
                      type="button"
                    >
                      <span>{walletNetworks[networkId].label}</span>
                      {network === networkId && <span className="text-xs text-tw-primary">Active</span>}
                    </button>
                  ))}
                </div>
                <p className="pt-2 text-xs leading-5 text-tw-on-surface-variant">
                  Switching networks does not create another account or hide assets from All Networks. Public networks may see your IP address and the addresses you look up.
                </p>
                {networkSaving && <p className="text-xs text-tw-on-surface-variant">Saving network…</p>}
                {networkError && <p aria-live="polite" className="text-xs text-tw-loss">{networkError}</p>}
              </div>
            )}

            {activePanel === 'manage_tokens' && (
              <div className="space-y-2">
                {tokens.map((token) => (
                  <label className="flex items-center justify-between rounded-2xl bg-tw-surface-container-low p-4" key={token.id}>
                    <span>{token.name} <span className="text-tw-on-surface-variant">({token.symbol})</span></span>
                    <input
                      aria-label={`Show ${token.symbol}`}
                      checked={!hiddenTokenIds.includes(token.id)}
                      className="h-5 w-5 accent-tw-primary"
                      onChange={() => toggleTokenVisibility(token.id)}
                      type="checkbox"
                    />
                  </label>
                ))}
              </div>
            )}

            {activePanel === 'asset' && selectedAsset && (
              <div className="space-y-3">
                <p className="text-sm text-tw-on-surface-variant">
                  {selectedAsset.symbol} · {selectedAsset.amount} · {selectedAsset.fiatValue}
                </p>
                <p className="text-sm text-tw-on-surface-variant">Receive network</p>
                <div aria-label="Asset receive network" className="max-h-40 space-y-2 overflow-y-auto" role="group">
                  {walletNetworkIds.map((networkId) => (
                    <button
                      aria-pressed={assetDetailNetwork === networkId}
                      className={`flex min-h-12 w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm ${
                        assetDetailNetwork === networkId
                          ? 'border-tw-primary bg-tw-primary/10'
                          : 'border-white/[0.06] bg-tw-surface-container-low'
                      }`}
                      key={networkId}
                      onClick={() => setAssetDetailNetwork(networkId)}
                      type="button"
                    >
                      {walletNetworks[networkId].label}
                      {assetDetailNetwork === networkId && <span className="text-xs text-tw-primary">Selected</span>}
                    </button>
                  ))}
                </div>
                {assetDetailAddress ? (
                  <>
                    <div className="flex justify-center rounded-2xl bg-white p-4">
                      <QRCodeSVG
                        aria-label={`${walletNetworks[assetDetailNetwork].label} receiving address QR code`}
                        size={192}
                        value={assetDetailAddress}
                      />
                    </div>
                    <code className="block break-all rounded-xl bg-tw-surface-container-low p-3 text-sm">{assetDetailAddress}</code>
                    <button
                      className="w-full rounded-full bg-tw-primary py-3 font-medium text-white"
                      onClick={() => void copyAddress(assetDetailAddress)}
                      type="button"
                    >
                      {copiedAddress === assetDetailAddress ? 'Copied!' : `Copy ${walletNetworks[assetDetailNetwork].symbol} address`}
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-tw-loss">
                    Address derivation is not implemented for {walletNetworks[assetDetailNetwork].label}. Do not use another network's address.
                  </p>
                )}
              </div>
            )}

            {activePanel === 'send' && (
              sendPreview ? (
                <div className="space-y-3">
                  <p className="rounded-2xl bg-tw-surface-container-low p-4 text-sm">
                    This is a preview only. No transaction has been created or sent.
                  </p>
                  <dl className="space-y-2 rounded-2xl bg-tw-surface-container-low p-4 text-sm">
                    <div>
                      <dt className="text-tw-on-surface-variant">Network</dt>
                      <dd>{walletNetworks[network].label}</dd>
                    </div>
                    <div>
                      <dt className="text-tw-on-surface-variant">Recipient</dt>
                      <dd className="break-all">{recipientAddress}</dd>
                    </div>
                    <div>
                      <dt className="text-tw-on-surface-variant">Amount</dt>
                      <dd>{sendAmount} {walletNetworks[network].symbol}</dd>
                    </div>
                    <div>
                      <dt className="text-tw-on-surface-variant">Estimated network fee</dt>
                      <dd aria-live="polite">
                        {networkFee?.fee || networkFeeError || 'Live fee estimate unavailable'}
                      </dd>
                    </div>
                  </dl>
                  <button className="w-full rounded-full bg-tw-primary py-3 font-medium text-white" onClick={closePanel}>Done</button>
                </div>
              ) : (
                <form className="space-y-3" onSubmit={handleSendPreview}>
                  <div>
                    <p className="mb-2 text-sm text-tw-on-surface-variant">Network · active send context</p>
                    <div aria-label="Send network" className="max-h-32 space-y-2 overflow-y-auto" role="group">
                      {walletNetworkIds.map((networkId) => (
                        <button
                          aria-pressed={network === networkId}
                          className={`flex min-h-11 w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs ${
                            network === networkId
                              ? 'border-tw-primary bg-tw-primary/10'
                              : 'border-white/[0.06] bg-tw-surface-container-low'
                          }`}
                          key={networkId}
                          onClick={() => {
                            void handleNetworkChange(networkId);
                            setSendPreview(false);
                          }}
                          type="button"
                        >
                          {walletNetworks[networkId].label}
                          {network === networkId && <span className="text-tw-primary">Selected</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="block text-sm text-tw-on-surface-variant" htmlFor="send-recipient">
                    Recipient address
                    <div className="mt-1 flex gap-2">
                      <input
                        aria-invalid={Boolean(recipientAddressWarning)}
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-tw-surface-container-low p-3 text-tw-on-surface"
                        id="send-recipient"
                        onChange={(event) => {
                          setRecipientAddress(event.target.value);
                          setSendValidationError('');
                        }}
                        placeholder="Enter wallet address"
                        required
                        value={recipientAddress}
                      />
                      <button
                        className="rounded-xl bg-tw-surface-container-high px-3 text-sm text-tw-primary"
                        onClick={async () => {
                          try {
                            if (!navigator.clipboard?.readText) throw new Error('Clipboard access is unavailable.');
                            setRecipientAddress(await navigator.clipboard.readText());
                          } catch {
                            setCopyFeedback('Clipboard access is unavailable. Paste into the address field manually.');
                          }
                        }}
                        type="button"
                      >
                        Paste
                      </button>
                    </div>
                  </label>
                  {recipientAddressWarning && (
                    <p className="text-xs text-amber-400" role="status">{recipientAddressWarning}</p>
                  )}
                  {networkFeeError && (
                    <p className="text-xs text-amber-400" role="status">{networkFeeError}</p>
                  )}
                  <dl className="rounded-xl bg-tw-surface-container-low p-3 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-tw-on-surface-variant">Active network</dt>
                      <dd className="text-right">{walletNetworks[network].label}</dd>
                    </div>
                    <div className="mt-2 flex justify-between gap-3">
                      <dt className="text-tw-on-surface-variant">Live fee estimate</dt>
                      <dd aria-live="polite" className="text-right">
                        {networkFeeLoading
                          ? 'Loading…'
                          : networkFee?.fee || 'Unavailable'}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-xl bg-tw-surface-container-high px-3 py-2 text-xs text-tw-primary disabled:opacity-50"
                      disabled={!networkAddress}
                      onClick={() => void copyAddress(networkAddress)}
                      type="button"
                    >
                      Copy my {walletNetworks[network].symbol} address
                    </button>
                    <button
                      className="rounded-xl bg-tw-surface-container-high px-3 py-2 text-xs text-tw-on-surface-variant disabled:opacity-50"
                      disabled={!networkAddress}
                      onClick={() => {
                        setReceiveAsset(network);
                        handleAction('receive');
                      }}
                      type="button"
                    >
                      View my address
                    </button>
                    {network === 'bitcoin' && (
                      <button
                        className="rounded-xl bg-tw-surface-container-high px-3 py-2 text-xs text-tw-on-surface-variant"
                        onClick={() => setRecipientAddress('bc1qth572nu57ylma80mshgxy6k9qd23wcs4lnz3tu')}
                        type="button"
                      >
                        Fill BTC sample address
                      </button>
                    )}
                    <button
                      className="rounded-xl bg-tw-surface-container-high px-3 py-2 text-xs text-tw-primary disabled:opacity-50"
                      disabled={!bitcoinAddress}
                      onClick={() => void copyAddress(bitcoinAddress)}
                      type="button"
                    >
                      Copy BTC address
                    </button>
                  </div>
                  {network === 'bitcoin' && (
                    <p className="text-xs text-tw-on-surface-variant">
                      Verify the recipient address before sending.
                    </p>
                  )}
                  {copyFeedback && <p aria-live="polite" className="text-xs text-tw-on-surface-variant">{copyFeedback}</p>}
                  <label className="block text-sm text-tw-on-surface-variant" htmlFor="send-amount">
                    Amount
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-tw-surface-container-low p-3 text-tw-on-surface"
                      id="send-amount"
                      min="0.000001"
                      onChange={(event) => {
                        setSendAmount(event.target.value);
                        setSendValidationError('');
                      }}
                      placeholder="0.00"
                      required
                      step="any"
                      type="number"
                      value={sendAmount}
                    />
                  </label>
                  {sendValidationError && (
                    <p aria-live="polite" className="text-xs text-tw-loss" role="alert">
                      {sendValidationError}
                    </p>
                  )}
                  <p className="text-xs text-tw-on-surface-variant">Review the details carefully before sending.</p>
                  <button className="w-full rounded-full bg-tw-primary py-3 font-medium text-white" type="submit">Review transaction</button>
                </form>
              )
            )}

            {activePanel === 'receive' && (
              <div className="space-y-3">
                <p className="text-sm text-tw-on-surface-variant">Choose an asset and network to get its matching wallet address.</p>
                <div aria-label="Receive asset" className="max-h-64 space-y-2 overflow-y-auto" role="group">
                  {receiveAssetOptions.map((asset) => {
                    const selected = receiveAsset === asset.id;
                    return (
                      <button
                        aria-pressed={selected}
                        className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                          selected
                            ? 'border-tw-primary bg-tw-primary/10'
                            : 'border-white/[0.06] bg-tw-surface-container-low'
                        }`}
                        key={asset.id}
                        onClick={() => {
                          setReceiveAsset(asset.id);
                          setCopyFeedback('');
                        }}
                        type="button"
                      >
                        {asset.logo ? (
                          <ChainAssetLogo className="h-8 w-8 shrink-0" kind={asset.logo} />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                            style={{ backgroundColor: `${asset.tint}22`, color: asset.tint }}
                          >
                            {asset.symbol === 'ETH' ? 'Ξ' : '◆'}
                          </span>
                        )}
                        <span className="flex min-w-0 flex-col">
                          <span className="text-xs font-medium text-tw-on-surface">{asset.symbol}</span>
                          <span className="text-[10px] text-tw-on-surface-variant">{asset.chain}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-sm text-tw-on-surface-variant">
                  {receiveAsset === 'ethereum' && isTestNetwork
                    ? 'Sepolia testnet address. Only use valueless testnet ETH.'
                    : `Receive ${selectedReceiveAsset?.symbol} on ${selectedReceiveAsset?.chain}. Check the selected network before sharing or sending funds.`}
                </p>
                {selectedReceiveAddress ? (
                  <>
                    <div className="flex justify-center rounded-2xl bg-white p-4">
                      <QRCodeSVG
                        aria-label={`${selectedReceiveAsset?.chain} receiving address QR code`}
                        size={192}
                        value={selectedReceiveAddress}
                      />
                    </div>
                    <code className="block break-all rounded-xl bg-tw-surface-container-low p-3 text-sm">{selectedReceiveAddress}</code>
                    <button
                      className="w-full rounded-full bg-tw-primary py-3 font-medium text-white"
                      onClick={() => void copyAddress(selectedReceiveAddress)}
                      type="button"
                    >
                      {copiedAddress === selectedReceiveAddress ? 'Copied!' : `Copy ${selectedReceiveAsset?.symbol} address`}
                    </button>
                  </>
                ) : walletAddress ? (
                  <p className="text-sm text-tw-loss">
                    Address derivation is not implemented for {selectedReceiveAsset?.chain} yet. Do not send funds to an address from another network.
                  </p>
                ) : (
                  <p className="text-sm text-tw-loss">Wallet address is unavailable. Lock and unlock the wallet first.</p>
                )}
                {copyFeedback && <p aria-live="polite" className="text-sm text-tw-on-surface-variant">{copyFeedback}</p>}
              </div>
            )}

            {activePanel === 'swap' && (
              <div className="space-y-3">
                <label className="block text-sm text-tw-on-surface-variant">You pay
                  <div className="mt-1 flex gap-2">
                    <input className="min-w-0 flex-1 rounded-xl border border-white/10 bg-tw-surface-container-low p-3 text-tw-on-surface" min="0" placeholder="0.00" type="number" />
                    <select aria-label="Token to swap" className="rounded-xl bg-tw-surface-container-high px-3 text-tw-on-surface"><option>BNB</option><option>BTC</option><option>ETH</option><option>SOL</option></select>
                  </div>
                </label>
                <div className="text-center text-tw-primary"><span className="material-symbols-outlined">south</span></div>
                <label className="block text-sm text-tw-on-surface-variant">You receive
                  <select aria-label="Receive token" className="mt-1 w-full rounded-xl bg-tw-surface-container-low p-3 text-tw-on-surface"><option>ETH</option><option>BNB</option><option>BTC</option><option>SOL</option></select>
                </label>
                <p className="text-xs text-tw-on-surface-variant">Live swap quotes are not available yet.</p>
                <button className="w-full rounded-full bg-tw-primary py-3 font-medium text-white" onClick={() => setSendPreview(true)}>Preview swap</button>
                {sendPreview && <p aria-live="polite" className="text-sm text-tw-on-surface-variant">Swap preview only. No transaction is created or sent.</p>}
              </div>
            )}

            {activePanel === 'settings' && (
              <div className="space-y-4">
                <form className="space-y-3 rounded-2xl border border-tw-primary/20 p-4" onSubmit={applyAccountBalance}>
                  <h3 className="text-sm font-medium text-tw-on-surface">Portfolio balance</h3>
                  <p className="text-xs leading-5 text-tw-on-surface-variant">
                    The balance is stored on your account, so it is the same on every device and is
                    never reset when you sign out or remove a wallet from this device.
                  </p>
                  <label className="block text-xs text-tw-on-surface-variant" htmlFor="account-balance">
                    Amount in USD
                    <input
                      autoComplete="off"
                      className="mt-2 w-full rounded-xl bg-tw-surface-container-low p-3 text-sm text-tw-on-surface"
                      id="account-balance"
                      inputMode="decimal"
                      min="0"
                      onChange={(event) => {
                        setBalanceDraft(event.target.value);
                        setAccountBalanceError('');
                        setAccountBalanceSaved(false);
                      }}
                      placeholder={String(accountBalance)}
                      step="any"
                      type="number"
                      value={balanceDraft}
                    />
                  </label>
                  {accountBalanceError && <p className="text-xs text-tw-loss">{accountBalanceError}</p>}
                  {!accountBalanceError && accountBalanceSaved && (
                    <p className="text-xs text-tw-primary">
                      {accountBalanceSaving ? 'Saving to your account…' : 'Saved to your account.'}
                    </p>
                  )}
                  <p className="text-xs text-tw-on-surface-variant">
                    {`Current balance: ${formatUsd(accountBalance)}`}
                  </p>
                  <button
                    className="w-full rounded-xl bg-tw-primary px-4 py-3 text-sm font-medium text-tw-on-primary disabled:opacity-60"
                    disabled={accountBalanceSaving || balanceDraft.trim().length === 0}
                    type="submit"
                  >
                    Save balance
                  </button>
                </form>
                <p className="rounded-2xl bg-tw-surface-container-low p-4 text-sm text-tw-on-surface-variant">
                  Deleting your wallet removes it from this device. Your funds stay on the blockchain — make sure your recovery phrase is backed up first.
                </p>
                <form className="space-y-3 rounded-2xl border border-tw-loss/20 p-4" onSubmit={handleDeleteWallet}>
                  <h3 className="text-sm font-medium text-tw-loss">Delete this browser wallet</h3>
                  <label className="block text-xs text-tw-on-surface-variant" htmlFor="delete-wallet-password">
                    Confirm wallet password
                    <input
                      autoComplete="current-password"
                      className="mt-2 w-full rounded-xl bg-tw-surface-container-low p-3 text-sm text-tw-on-surface"
                      id="delete-wallet-password"
                      onChange={(event) => setDeletePassword(event.target.value)}
                      required
                      type="password"
                      value={deletePassword}
                    />
                  </label>
                  {deleteError && <p aria-live="polite" className="text-xs text-tw-loss">{deleteError}</p>}
                  <button
                    className="w-full rounded-full bg-tw-loss py-3 text-sm font-medium text-white disabled:opacity-50"
                    disabled={deletingWallet}
                    type="submit"
                  >
                    {deletingWallet ? 'Verifying password…' : 'Verify and delete wallet'}
                  </button>
                </form>
                <button className="w-full rounded-full bg-tw-surface-container-high py-3 font-medium" onClick={closePanel}>Close</button>
              </div>
            )}

            {['buy', 'scanner', 'notifications', 'security', 'earn', 'discover'].includes(activePanel) && (
              <div className="space-y-3">
                <p className="rounded-2xl bg-tw-surface-container-low p-4 text-sm text-tw-on-surface-variant">
                  {activePanel === 'buy' && 'Buying crypto is not available yet.'}
                  {activePanel === 'scanner' && 'QR scanning is not available yet.'}
                  {activePanel === 'notifications' && "You're all caught up. No new notifications."}
                  {activePanel === 'security' && 'Security settings are not available yet.'}
                  {activePanel === 'earn' && 'Staking and earning are not available yet.'}
                  {activePanel === 'discover' && 'DApp browsing is not available yet.'}
                </p>
                <button className="w-full rounded-full bg-tw-surface-container-high py-3 font-medium" onClick={closePanel}>Close</button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default MainAssetsPortfolio;