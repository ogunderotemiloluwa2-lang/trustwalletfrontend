import { clearAccountSession, readAccountSession, saveAccountSession } from './authSession';

const SESSION_KEY = 'account-session';

const validSession = {
  token: 'header.payload.signature',
  user: { id: 'user_1', name: 'Ada', hasPin: false, balance: 0 },
};

describe('account session storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns null when nothing has been stored', () => {
    expect(readAccountSession()).toBeNull();
  });

  it('round-trips a saved session', () => {
    saveAccountSession(validSession);
    expect(readAccountSession()).toEqual(validSession);
  });

  it('ignores malformed JSON instead of throwing', () => {
    window.localStorage.setItem(SESSION_KEY, '{not json');
    expect(readAccountSession()).toBeNull();
  });

  it('ignores a stored value with a missing or invalid shape', () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ token: 'abc' }));
    expect(readAccountSession()).toBeNull();

    window.sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ token: 'abc', user: { id: 1, name: 'A' } })
    );
    expect(readAccountSession()).toBeNull();
  });

  it('clears a stored session', () => {
    saveAccountSession(validSession);
    clearAccountSession();
    expect(readAccountSession()).toBeNull();
  });
});
