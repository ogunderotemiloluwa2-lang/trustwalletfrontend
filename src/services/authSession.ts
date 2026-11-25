import { AuthenticatedUser, AuthSession } from './authApi';

/**
 * Holds the signed-in account for the current tab only.
 *
 * Account data lives in MongoDB and is re-verified against the API, so nothing
 * is written to `localStorage`. `sessionStorage` keeps the session alive across
 * a refresh in the same tab while still ending it when the tab is closed.
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
    typeof user.id === 'string' && typeof user.email === 'string' && typeof user.name === 'string';
};

export const readAccountSession = (): AuthSession | null => {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isStoredSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const saveAccountSession = (session: AuthSession): void => {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // A full or blocked storage quota must not break a successful sign-in.
  }
};

export const clearAccountSession = (): void => {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore storage failures on sign-out.
  }
};
