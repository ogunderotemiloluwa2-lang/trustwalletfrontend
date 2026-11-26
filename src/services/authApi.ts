import { normalizeAccountBalance } from '../wallet/portfolioBalance';

export interface AuthenticatedUser {
  id: string;
  name: string;
  /** True once the account has a six-digit sign-in code stored on the server. */
  hasPin: boolean;
  /** Headline balance in USD, stored on the account so every device agrees. */
  balance: number;
}

export interface AuthSession {
  token: string;
  user: AuthenticatedUser;
}

interface AuthResponse {
  token?: unknown;
  user?: unknown;
  error?: unknown;
}

/**
 * Authentication failure that keeps the HTTP status, so callers can tell a
 * rejected credential apart from an unreachable service.
 */
export class AuthRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthRequestError';
    this.status = status;
  }
}

/**
 * Base URL of the authentication API. In development this falls back to the
 * local backend; in production it must be set to the deployed backend origin
 * (for example `https://trustwalletbackend.onrender.com`) because the frontend
 * and backend are hosted on different domains.
 */
export const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

const authUrl = (path: string): string => `${API_BASE_URL}/api/auth/${path}`;

const parseUser = (value: unknown): AuthenticatedUser => {
  if (!value || typeof value !== 'object') {
    throw new Error('Authentication service returned an invalid user profile.');
  }
  const user = value as Record<string, unknown>;
  if (typeof user.id !== 'string' || typeof user.name !== 'string') {
    throw new Error('Authentication service returned an invalid user profile.');
  }
  return {
    id: user.id,
    name: user.name,
    hasPin: user.hasPin === true,
    balance: normalizeAccountBalance(user.balance),
  };
};

const request = async (
  path: string,
  body: Record<string, string>,
  fetcher: typeof fetch
): Promise<AuthSession> => {
  const response = await fetcher(authUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const result: AuthResponse = await response.json();
  if (!response.ok) {
    throw new AuthRequestError(
      typeof result.error === 'string' ? result.error : 'Authentication request failed.',
      response.status
    );
  }
  if (typeof result.token !== 'string') {
    throw new Error('Authentication service did not return a session token.');
  }
  return { token: result.token, user: parseUser(result.user) };
};

export const registerAccount = (
  input: { password: string; name?: string },
  fetcher: typeof fetch = fetch
): Promise<AuthSession> => request('register', {
  password: input.password,
  name: input.name || '',
}, fetcher);

/**
 * Signs in with the six-digit code, or with the wallet password when the code
 * has been forgotten. There is no email address: the server locates the account
 * from the credential itself.
 */
export const loginAccount = (
  input: { password?: string; pin?: string },
  fetcher: typeof fetch = fetch
): Promise<AuthSession> => request('login', {
  password: input.password || '',
  pin: input.pin || '',
}, fetcher);

/**
 * Stores the six-digit code that replaces the password for later sign-ins. The
 * code is hashed on the server and never kept in the browser.
 */
export const setAccountPin = async (
  token: string,
  pin: string,
  fetcher: typeof fetch = fetch
): Promise<AuthenticatedUser> => {
  const response = await fetcher(authUrl('pin'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ pin }),
  });
  const result: AuthResponse = await response.json();
  if (!response.ok) {
    throw new Error(typeof result.error === 'string' ? result.error : 'Could not save the six-digit code.');
  }
  return parseUser(result.user);
};

export const fetchAuthenticatedProfile = async (
  token: string,
  fetcher: typeof fetch = fetch
): Promise<AuthenticatedUser> => {
  const response = await fetcher(authUrl('me'), {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const result: AuthResponse = await response.json();
  if (!response.ok) {
    throw new Error(typeof result.error === 'string' ? result.error : 'Could not load user profile.');
  }
  return parseUser(result.user);
};

/**
 * Saves the headline balance on the account so the amount follows the wallet
 * owner instead of this browser.
 */
export const saveAccountBalance = async (
  token: string,
  balance: number,
  fetcher: typeof fetch = fetch
): Promise<AuthenticatedUser> => {
  const response = await fetcher(authUrl('balance'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ balance }),
  });
  const result: AuthResponse = await response.json();
  if (!response.ok) {
    throw new Error(typeof result.error === 'string' ? result.error : 'Could not save the balance.');
  }
  return parseUser(result.user);
};
