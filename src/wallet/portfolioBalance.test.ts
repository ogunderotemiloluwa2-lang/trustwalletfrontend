import { DEFAULT_ACCOUNT_BALANCE, normalizeAccountBalance } from './portfolioBalance';

describe('normalizeAccountBalance', () => {
  it('keeps a valid amount', () => {
    expect(normalizeAccountBalance(0)).toBe(0);
    expect(normalizeAccountBalance(1_500)).toBe(1_500);
    expect(normalizeAccountBalance(12.5)).toBe(12.5);
  });

  it('accepts a numeric string from the API', () => {
    expect(normalizeAccountBalance('250')).toBe(250);
  });

  it('falls back to zero for anything unusable', () => {
    expect(normalizeAccountBalance(undefined)).toBe(DEFAULT_ACCOUNT_BALANCE);
    expect(normalizeAccountBalance(null)).toBe(DEFAULT_ACCOUNT_BALANCE);
    expect(normalizeAccountBalance('')).toBe(DEFAULT_ACCOUNT_BALANCE);
    expect(normalizeAccountBalance('abc')).toBe(DEFAULT_ACCOUNT_BALANCE);
    expect(normalizeAccountBalance(Number.NaN)).toBe(DEFAULT_ACCOUNT_BALANCE);
    expect(normalizeAccountBalance(Number.POSITIVE_INFINITY)).toBe(DEFAULT_ACCOUNT_BALANCE);
    expect(normalizeAccountBalance(-1)).toBe(DEFAULT_ACCOUNT_BALANCE);
  });

  it('defaults to zero', () => {
    expect(DEFAULT_ACCOUNT_BALANCE).toBe(0);
  });
});
