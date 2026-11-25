export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  /** True once the account has a six-digit sign-in code stored on the server. */
  hasPin: boolean;
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
  if (typeof user.id !== 'string' || typeof user.email !== 'string' ||
      typeof user.name !== 'string') {
    throw new Error('Authentication service returned an invalid user profile.');
  }
  return { id: user.id, email: user.email, name: user.name, hasPin: user.hasPin === true };
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
    throw new Error(typeof result.error === 'string' ? result.error : 'Authentication request failed.');
  }
  if (typeof result.token !== 'string') {
    throw new Error('Authentication service did not return a session token.');
  }
  return { token: result.token, user: parseUser(result.user) };
};

export const registerAccount = (
  input: { email: string; password: string; name?: string },
  fetcher: typeof fetch = fetch
): Promise<AuthSession> => request('register', {
  email: input.email,
  password: input.password,
  name: input.name || '',
}, fetcher);

export const loginAccount = (
  input: { email: string; password?: string; pin?: string },
  fetcher: typeof fetch = fetch
): Promise<AuthSession> => request('login', {
  email: input.email,
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
