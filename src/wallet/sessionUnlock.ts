/**
 * Keeps the wallet openable with the six-digit code without weakening the
 * encrypted keystore.
 *
 * The wallet password and the six-digit code live in `localStorage` so the
 * owner signs in once and afterwards only ever enters the code to open the
 * wallet, even in a new tab or after restarting the browser. The password is
 * still required to decrypt the keystore, so the code alone never exposes it.
 *
 * The lock flag and the idle clock stay in `sessionStorage`: they describe the
 * current tab, and a fresh tab must start locked.
 */
const UNLOCK_KEY = 'wallet-session-unlock';
const LOCKED_KEY = 'wallet-session-locked';
const PIN_KEY = 'wallet-session-pin';
const ACTIVITY_KEY = 'wallet-session-activity';

/** The wallet locks itself after this much inactivity. */
export const IDLE_TIMEOUT_MS = 3 * 60 * 1000;

/** Storage that survives a tab close, so the code keeps working after a restart. */
const persistentStorage = (): Storage => window.localStorage;

export const rememberUnlock = (password: string): void => {
  try {
    persistentStorage().setItem(UNLOCK_KEY, password);
  } catch {
    // A blocked or full storage must not break unlocking.
  }
};

export const readRememberedUnlock = (): string | null => {
  try {
    return persistentStorage().getItem(UNLOCK_KEY);
  } catch {
    return null;
  }
};

export const forgetUnlock = (): void => {
  try {
    persistentStorage().removeItem(UNLOCK_KEY);
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
 * Remembers the six-digit code so the owner only ever enters it to open the
 * wallet, in this tab and in later ones. The code is never written to the
 * server; the authoritative copy is the bcrypt hash stored in MongoDB.
 */
export const rememberSessionPin = (pin: string): void => {
  try {
    persistentStorage().setItem(PIN_KEY, pin);
  } catch {
    // A blocked or full storage must not break wallet creation.
  }
};

export const readSessionPin = (): string | null => {
  try {
    return persistentStorage().getItem(PIN_KEY);
  } catch {
    return null;
  }
};

export const forgetSessionPin = (): void => {
  try {
    persistentStorage().removeItem(PIN_KEY);
  } catch {
    // Ignore storage failures while locking.
  }
};

/**
 * Records the last moment the owner interacted with the wallet. The timestamp
 * lives in `sessionStorage` so a refresh cannot be used to outlive the idle
 * timeout, and it is never written to `localStorage`.
 */
export const markSessionActivity = (now: number = Date.now()): void => {
  try {
    window.sessionStorage.setItem(ACTIVITY_KEY, String(now));
  } catch {
    // A blocked or full session storage must not break the wallet.
  }
};

export const readSessionActivity = (): number | null => {
  try {
    const raw = window.sessionStorage.getItem(ACTIVITY_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
};

export const clearSessionActivity = (): void => {
  try {
    window.sessionStorage.removeItem(ACTIVITY_KEY);
  } catch {
    // Ignore storage failures while locking.
  }
};

/**
 * True when the wallet has been untouched for longer than the idle timeout, or
 * when no activity was ever recorded for this tab.
 */
export const isSessionIdle = (now: number = Date.now()): boolean => {
  const last = readSessionActivity();
  if (last === null) return true;
  return now - last >= IDLE_TIMEOUT_MS;
};
