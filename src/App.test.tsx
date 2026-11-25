import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import MainAssetsPortfolio from './pages/MainAssetsPortfolio';
import { deriveWalletAddress } from './wallet/walletSetup';
import { useWalletSetup, WalletSetupProvider } from './wallet/WalletSetupContext';

const TEST_PHRASE = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

// jsdom computes accessible names for every button on each getByRole call, which
// costs seconds per query in this suite. The default 5s budget is not enough.
jest.setTimeout(60_000);

const ImportTestWallet: React.FC = () => {
  const { importWallet } = useWalletSetup();
  React.useEffect(() => {
    importWallet(TEST_PHRASE);
  }, [importWallet]);
  return null;
};

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

// The headline balance is the demo balance plus the live wallet value, so the
// demo rule is pinned to a fixed anchor to keep the assertions deterministic.
jest.mock('./wallet/demoPortfolio', () => {
  const actual = jest.requireActual('./wallet/demoPortfolio');
  return {
    ...actual,
    useDemoPortfolio: (specText: string) => {
      const spec = actual.resolveDemoPortfolioSpec(specText);
      return { value: 0, spec, growthLabel: actual.describeDemoPortfolio(spec) };
    },
  };
});

jest.mock('./wallet/marketPrices', () => ({
  fetchMarketPrices: jest.fn().mockImplementation((coins: string[]) =>
    Promise.resolve({
      [coins[0]]: { usd: coins[0] === 'binancecoin' ? 600 : 2_000, usd24hChange: 1 },
    })
  ),
  formatPriceChange: (change: number) => `${change > 0 ? '+' : ''}${change.toFixed(2)}%`,
  formatUsd: (amount: number) => `$${amount.toFixed(2)}`,
}));

jest.mock('./wallet/networks', () => ({
  ...jest.requireActual('./wallet/networks'),
  readNativeBalance: jest.fn().mockResolvedValue('0'),
}));

jest.mock('./wallet/keystoreStorage', () => ({
  ...jest.requireActual('./wallet/keystoreStorage'),
  writeSelectedNetwork: jest.fn().mockResolvedValue('bnb'),
}));

const renderPortfolio = async () => {
  const result = render(
    <WalletSetupProvider>
      <MainAssetsPortfolio />
    </WalletSetupProvider>
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return result;
};

test('renders portfolio and previews a send without submitting a transaction', async () => {
  await renderPortfolio();

  expect(screen.getAllByText('Ethereum Mainnet').length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('button', { name: /send/i }));

  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Recipient address'), {
    target: { value: '0x9858EfFD232B4033E47d90003D41EC34EcaEda94' },
  });
  fireEvent.change(within(dialog).getByLabelText('Amount'), {
    target: { value: '0.5' },
  });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Review transaction' }));

  expect(within(dialog).getByText(/preview only/i)).toBeInTheDocument();
  expect(within(dialog).getByText(/No transaction has been created or sent/i)).toBeInTheDocument();
});

test('send panel always offers a copyable BTC address', async () => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: jest.fn().mockResolvedValue(undefined) },
  });
  render(
    <WalletSetupProvider>
      <ImportTestWallet />
      <MainAssetsPortfolio />
    </WalletSetupProvider>
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  fireEvent.click(screen.getByRole('button', { name: /send/i }));
  const dialog = within(screen.getByRole('dialog'));
  await act(async () => {
    fireEvent.click(dialog.getByRole('button', { name: 'Copy BTC address' }));
  });

  expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
    'bc1qth572nu57ylma80mshgxy6k9qd23wcs4lnz3tu'
  );
}, 60_000);

test('token visibility controls update the portfolio list', async () => {
  const { container } = await renderPortfolio();

  expect(container.querySelector('[data-symbol="ETH"]')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Manage token visibility' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Show ETH' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));

  expect(container.querySelector('[data-symbol="ETH"]')).not.toBeInTheDocument();
});

test('NFT tab displays its empty state', async () => {
  await renderPortfolio();

  fireEvent.click(screen.getByRole('button', { name: 'NFTs' }));
  expect(screen.getByText('No Collectibles Found')).toBeInTheDocument();
});

test('balance visibility and token search work', async () => {
  const { container } = await renderPortfolio();

  const balance = container.querySelector('#portfolio-balance');
  if (!balance) throw new Error('Portfolio balance element was not rendered.');
  fireEvent.click(screen.getByRole('button', { name: 'Toggle Balance Visibility' }));
  expect(balance).toHaveTextContent('••••••••');
  fireEvent.click(screen.getByRole('button', { name: 'Toggle Balance Visibility' }));
  expect(balance).not.toHaveTextContent('••••••••');

  fireEvent.change(screen.getByRole('textbox', { name: 'Search tokens or address' }), {
    target: { value: 'eth' },
  });
  expect(screen.getAllByText('ETH').length).toBeGreaterThan(0);
  expect(container.querySelector('[data-symbol="BTC"]')).not.toBeInTheDocument();
});

test('wallet identity is separate from the selected Ethereum network', async () => {
  await renderPortfolio();

  expect(screen.getByRole('button', { name: /Wallet: Main Wallet 1/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Wallet: Main Wallet 1/ }));

  expect(screen.getByRole('dialog')).toHaveTextContent('Ethereum Mainnet');
  expect(screen.getByRole('button', { name: 'Ethereum Mainnet Active' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'All Networks' })).toHaveAttribute('aria-pressed', 'true');
});

test('All Networks aggregates balances across multiple chains', async () => {
  const { readNativeBalance } = jest.requireMock('./wallet/networks');
  const { fetchMarketPrices } = jest.requireMock('./wallet/marketPrices');
  readNativeBalance.mockImplementation((_address: string, chain: string) =>
    Promise.resolve(chain === 'ethereum' ? '1' : chain === 'bitcoin' ? '2' : '0')
  );
  fetchMarketPrices.mockImplementation((coins: string[]) =>
    Promise.resolve(
      coins.reduce<Record<string, { usd: number; usd24hChange: number }>>((quotes, coin) => {
        quotes[coin] = { usd: coin === 'bitcoin' ? 100 : 10, usd24hChange: 1 };
        return quotes;
      }, {})
    )
  );

  try {
    const { container } = render(
      <WalletSetupProvider>
        <ImportTestWallet />
        <MainAssetsPortfolio />
      </WalletSetupProvider>
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => {
      expect(container.querySelector('[data-symbol="BTC"]')).toBeInTheDocument();
    });

    // 1 ETH at $10 plus 2 BTC at $100 = $210, aggregated across chains.
    await waitFor(() => {
      expect(container.querySelector('#portfolio-balance')).toHaveTextContent('$210.00');
    });
  } finally {
    readNativeBalance.mockResolvedValue('0');
    fetchMarketPrices.mockImplementation((coins: string[]) =>
      Promise.resolve({
        [coins[0]]: { usd: coins[0] === 'binancecoin' ? 600 : 2_000, usd24hChange: 1 },
      })
    );
  }
});

test('bottom navigation opens four separate mobile screens', async () => {
  await renderPortfolio();

  const navigation = within(screen.getByRole('navigation'));
  expect(navigation.getAllByRole('button')).toHaveLength(4);
  expect(navigation.getByRole('button', { name: /Home/ })).toHaveAttribute('aria-current', 'page');

  fireEvent.click(navigation.getByRole('button', { name: /Swap/ }));
  expect(screen.getByRole('heading', { name: 'Swap' })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Token to pay' })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Token to receive' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reverse swap direction' }));
  expect(screen.getByRole('button', { name: 'Swap unavailable' })).toBeDisabled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  fireEvent.click(navigation.getByRole('button', { name: /Explore/ }));
  expect(screen.getByRole('heading', { name: 'Explore' })).toBeInTheDocument();
  expect(screen.getByRole('searchbox', { name: 'Search or enter URL' })).toBeInTheDocument();

  fireEvent.click(navigation.getByRole('button', { name: /Settings/ }));
  expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Wallets & networks/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Delete local wallet/i }));
  expect(screen.getByRole('dialog')).toHaveTextContent('Delete this browser wallet');
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close panel' }));
});

test('receive panel never presents a placeholder address as a real wallet', async () => {
  await renderPortfolio();

  fireEvent.click(screen.getByRole('button', { name: 'arrow_downward Receive' }));
  expect(screen.queryByRole('button', { name: /Copy ETH address/ })).not.toBeInTheDocument();
  expect(screen.getByText(/Wallet address is unavailable/i)).toBeInTheDocument();
});

test('receive panel shows BTC, Tether, and Tron logos and never fabricates missing addresses', async () => {
  await renderPortfolio();

  fireEvent.click(screen.getByRole('button', { name: 'arrow_downward Receive' }));
  const receiveDialog = within(screen.getByRole('dialog'));
  expect(receiveDialog.getByRole('img', { name: 'Bitcoin logo' })).toBeInTheDocument();
  expect(receiveDialog.getAllByRole('img', { name: 'Tether logo' })).toHaveLength(3);
  expect(receiveDialog.getByRole('img', { name: 'TRON logo' })).toBeInTheDocument();

  fireEvent.click(receiveDialog.getByRole('button', { name: /BTC Bitcoin/ }));
  expect(receiveDialog.getByText(/Wallet address is unavailable/i)).toBeInTheDocument();
  expect(receiveDialog.queryByRole('button', { name: /Copy BTC address/ })).not.toBeInTheDocument();
});

test('receive panel shows and copies the derived Native SegWit Bitcoin address with a QR code', async () => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: jest.fn().mockResolvedValue(undefined) },
  });
  render(
    <WalletSetupProvider>
      <ImportTestWallet />
      <MainAssetsPortfolio />
    </WalletSetupProvider>
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  fireEvent.click(screen.getByRole('button', { name: 'arrow_downward Receive' }));
  const receiveDialog = within(screen.getByRole('dialog'));
  fireEvent.click(receiveDialog.getByRole('button', { name: /BTC Bitcoin/ }));

  expect(receiveDialog.getByLabelText('Bitcoin receiving address QR code')).toBeInTheDocument();
  expect(receiveDialog.getByText('bc1qth572nu57ylma80mshgxy6k9qd23wcs4lnz3tu')).toBeInTheDocument();
  await act(async () => {
    fireEvent.click(receiveDialog.getByRole('button', { name: 'Copy BTC address' }));
  });
  expect(receiveDialog.getByRole('button', { name: 'Copied!' })).toBeInTheDocument();
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
    'bc1qth572nu57ylma80mshgxy6k9qd23wcs4lnz3tu'
  );
}, 60_000);

test('Home shows BTC, USDT, and TRX receive shortcuts with chain logos', async () => {
  await renderPortfolio();

  expect(screen.getByRole('region', { name: 'Receive on other networks' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Receive BTC on Bitcoin' }));

  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(within(screen.getByRole('dialog')).getByRole('button', { name: /BTC Bitcoin/ }))
    .toHaveAttribute('aria-pressed', 'true');
});

test('portfolio defaults to All Networks and supports an independent chain filter', async () => {
  const { container } = await renderPortfolio();

  await waitFor(() => {
    expect(container.querySelector('#portfolio-balance')).toHaveTextContent('$0.00');
  });
  expect(screen.getByRole('button', { name: 'All Networks' })).toHaveAttribute('aria-pressed', 'true');
  // Bitcoin is always listed even before it holds a balance; other unfunded
  // chains stay hidden.
  expect(container.querySelectorAll('.token-row')).toHaveLength(2);
  expect(container.querySelector('[data-symbol="ETH"]')).toBeInTheDocument();
  expect(container.querySelector('[data-symbol="BTC"]')).toBeInTheDocument();
  expect(container.querySelector('[data-symbol="SOL"]')).not.toBeInTheDocument();
  expect(screen.queryByText('Balance not connected')).not.toBeInTheDocument();
  expect(screen.getByText(/Balances are combined across every network you have added/i)).toBeInTheDocument();
  expect(screen.getByText(/Wallet value · balances and prices across your networks/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Bitcoin' }));
  expect(screen.getByRole('button', { name: 'Bitcoin' })).toHaveAttribute('aria-pressed', 'true');
});

test('selecting BNB Chain shows the live native BNB asset instead of Ethereum assets', async () => {
  const { container } = await renderPortfolio();

  fireEvent.click(screen.getByRole('button', { name: /Wallet: Main Wallet 1/ }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'BNB Smart Chain' }));

  // Query the DOM directly: repeated getByRole lookups are slow enough in jsdom to
  // exceed waitFor's default timeout before the network selection settles.
  await waitFor(() => {
    const activeNetwork = container.querySelector('[aria-label="Active network"] button[aria-pressed="true"]');
    expect(activeNetwork).toHaveTextContent('BNB Smart Chain');
  });
  expect(container.querySelector('[data-symbol="BNB"]')).toBeInTheDocument();
  expect(container.querySelector('[data-symbol="ETH"]')).not.toBeInTheDocument();
  expect(screen.getByText(/Native BNB balance/i)).toBeInTheDocument();
});

test('swap panel only provides a non-network preview', async () => {
  await renderPortfolio();

  fireEvent.click(screen.getAllByRole('button', { name: /swap/i })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Preview swap' }));

  expect(screen.getByText(/Swap preview only/i)).toBeInTheDocument();
});

test('DeFi discovery belongs to Explore and is clearly marked as unavailable', async () => {
  await renderPortfolio();

  expect(screen.getByRole('button', { name: 'Crypto' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'NFTs' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'DeFi' })).not.toBeInTheDocument();
  fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Explore/ }));
  expect(screen.getByText('DeFi & staking')).toBeInTheDocument();
  expect(screen.getByText(/Staking and protocol discovery are not available yet/i)).toBeInTheDocument();
});

test('import rejects an invalid recovery phrase', () => {
  expect(() => deriveWalletAddress('not a valid recovery phrase')).toThrow(
    'Enter a valid BIP-39 recovery phrase with a correct checksum.'
  );
});
