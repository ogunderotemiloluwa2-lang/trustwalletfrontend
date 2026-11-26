import { AuthenticatedUser, AuthSession } from './authApi';
import { normalizeAccountBalance } from '../wallet/portfolioBalance';

/**
 * Holds the signed-in account so the owner signs in once per device.
 *
 * Account data lives in MongoDB and is re-verified against the API. The session
 * is kept in `localStorage` so a returning owner only has to enter the
 * six-digit code to open the wallet; signing in with the password is only
 * needed on a new device or after signing out.
 */
const SESSION_KEY = 'account-session';

interface StoredSession {
  token: string;
  user: AuthenticatedUser;
}

const isStoredSession = (value: unknown): value is StoredSession => {
  if (!value || typeof value !== 'object') return false;
  const session = value as Record<string, unknown>;
  const user = session.user as Record<string, unknown> | undefined;
  return typeof session.token === 'string' && !!user &&
    typeof user.id === 'string' && typeof user.name === 'string';
};

/** Older sessions were stored before the account balance existed. */
const withDefaults = (session: StoredSession): AuthSession => ({
  token: session.token,
  user: {
    ...session.user,
    hasPin: session.user.hasPin === true,
    balance: normalizeAccountBalance(session.user.balance),
  },
});

export const readAccountSession = (): AuthSession | null => {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isStoredSession(parsed) ? withDefaults(parsed) : null;
  } catch {
    return null;
  }
};

export const saveAccountSession = (session: AuthSession): void => {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // A full or blocked storage quota must not break a successful sign-in.
  }
};

export const clearAccountSession = (): void => {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore storage failures on sign-out.
  }
};
