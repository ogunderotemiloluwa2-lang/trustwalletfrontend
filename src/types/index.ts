export interface Token {
  id: string;
  name: string;
  symbol: string;
  network: string;
  price: string;
  change: string;
  changeType: 'gain' | 'loss';
  amount: string;
  fiatValue: string;
  icon: string;
  iconColor: string;
  /** Overrides the glyph color when it differs from the avatar tint */
  glyphColor?: string;
  /** Small glyph shown on the token avatar corner (e.g. chain marker) */
  badge?: { label: string; color: string };
  isOfficial?: boolean;
  isVerified?: boolean;
}

export interface Wallet {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
}

export type TabType = 'crypto' | 'nfts' | 'defi';

export type ActionType = 'send' | 'receive' | 'buy' | 'swap' | 'manage_tokens';