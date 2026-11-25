/**
 * Keeps the wallet unlocked across a page refresh without weakening the
 * encrypted keystore.
 *
 * The wallet password is held in `sessionStorage`, which is scoped to a single
 * tab and discarded when that tab closes. A refresh therefore restores the
 * unlocked session, while a new tab or a reopened browser still requires the
 * password. Nothing is ever written to `localStorage` or to disk.
 */
const UNLOCK_KEY = 'wallet-session-unlock';
const LOCKED_KEY = 'wallet-session-locked';
const PIN_KEY = 'wallet-session-pin';

export const rememberUnlock = (password: string): void => {
  try {
    window.sessionStorage.setItem(UNLOCK_KEY, password);
  } catch {
    // A blocked or full session storage must not break unlocking.
  }
};

export const readRememberedUnlock = (): string | null => {
  try {
    return window.sessionStorage.getItem(UNLOCK_KEY);
  } catch {
    return null;
  }
};

export const forgetUnlock = (): void => {
  try {
    window.sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    // Ignore storage failures while locking.
  }
};

/**
 * Records that the user locked the wallet on purpose. The remembered password
 * is kept so the six-digit code can unlock the vault again, but a refresh must
 * not silently bypass the lock.
 */
export const markSessionLocked = (): void => {
  try {
    window.sessionStorage.setItem(LOCKED_KEY, '1');
  } catch {
    // Ignore storage failures while locking.
  }
};

export const readSessionLocked = (): boolean => {
  try {
    return window.sessionStorage.getItem(LOCKED_KEY) === '1';
  } catch {
    return false;
  }
};

export const clearSessionLocked = (): void => {
  try {
    window.sessionStorage.removeItem(LOCKED_KEY);
  } catch {
    // Ignore storage failures while unlocking.
  }
};

/**
 * Remembers the six-digit code for the current tab so a refresh does not force
 * the user to retype it. The code is never written to `localStorage`; the
 * authoritative copy is the bcrypt hash stored in MongoDB.
 */
export const rememberSessionPin = (pin: string): void => {
  try {
    window.sessionStorage.setItem(PIN_KEY, pin);
  } catch {
    // A blocked or full session storage must not break wallet creation.
  }
};

export const readSessionPin = (): string | null => {
  try {
    return window.sessionStorage.getItem(PIN_KEY);
  } catch {
    return null;
  }
};

export const forgetSessionPin = (): void => {
  try {
    window.sessionStorage.removeItem(PIN_KEY);
  } catch {
    // Ignore storage failures while locking.
  }
};
