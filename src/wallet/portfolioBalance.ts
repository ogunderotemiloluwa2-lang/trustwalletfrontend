/**
 * Headline portfolio balance.
 *
 * The balance is a plain USD amount owned by the account and stored on the
 * server, so it is identical on every device and is never reset by signing out
 * or by removing a wallet from this device. It stays at zero until an amount is
 * set for the account.
 */
export const DEFAULT_ACCOUNT_BALANCE = 0;

/** Coerces a value coming from the API into a usable, non-negative amount. */
export const normalizeAccountBalance = (value: unknown): number => {
  const amount = typeof value === 'string' ? Number(value.trim()) : value;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
    return DEFAULT_ACCOUNT_BALANCE;
  }
  return amount;
};
