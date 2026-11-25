import { AuthenticatedUser, AuthSession } from './authApi';

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
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isStoredSession(parsed) ? parsed : null;
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
