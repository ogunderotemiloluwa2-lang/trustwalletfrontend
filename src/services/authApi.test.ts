import {
  API_BASE_URL,
  fetchAuthenticatedProfile,
  loginAccount,
  registerAccount,
  setAccountPin,
} from './authApi';

test('registers an account through the API and returns its authenticated profile', async () => {
  const fetcher = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      token: 'signed-session-token',
      user: { id: 'user-1', email: 'user@example.com', name: 'User', hasPin: false },
    }),
  });

  await expect(registerAccount({
    email: 'user@example.com',
    password: 'a secure password',
    name: 'User',
  }, fetcher as typeof fetch)).resolves.toEqual({
    token: 'signed-session-token',
    user: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      hasPin: false,
      demoPortfolioSpec: '',
    },
  });
  expect(fetcher).toHaveBeenCalledWith(`${API_BASE_URL}/api/auth/register`, expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({ email: 'user@example.com', password: 'a secure password', name: 'User' }),
  }));
});

test('logs in and loads the authenticated profile using a bearer token', async () => {
  const fetcher = jest.fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'signed-session-token',
        user: { id: 'user-1', email: 'user@example.com', name: 'User', hasPin: false },
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 'user-1', email: 'user@example.com', name: 'User', hasPin: false } }),
    });

  await expect(loginAccount({
    email: 'user@example.com',
    password: 'a secure password',
  }, fetcher as typeof fetch)).resolves.toMatchObject({ token: 'signed-session-token' });
  await expect(fetchAuthenticatedProfile('signed-session-token', fetcher as typeof fetch))
    .resolves.toEqual({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      hasPin: false,
      demoPortfolioSpec: '',
    });
  expect(fetcher).toHaveBeenLastCalledWith(`${API_BASE_URL}/api/auth/me`, expect.objectContaining({
    headers: { Authorization: 'Bearer signed-session-token', Accept: 'application/json' },
  }));
});

test('surfaces authentication API validation errors', async () => {
  const fetcher = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ error: 'Invalid email or password.' }),
  });

  await expect(loginAccount({
    email: 'user@example.com',
    password: 'incorrect',
  }, fetcher as typeof fetch)).rejects.toThrow('Invalid email or password.');
});

test('signs in with the six-digit code instead of the password', async () => {
  const fetcher = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      token: 'signed-session-token',
      user: { id: 'user-1', email: 'user@example.com', name: 'User', hasPin: true },
    }),
  });

  await expect(loginAccount({ email: 'user@example.com', pin: '123456' }, fetcher as typeof fetch))
    .resolves.toMatchObject({ user: { hasPin: true } });
  expect(fetcher).toHaveBeenCalledWith(`${API_BASE_URL}/api/auth/login`, expect.objectContaining({
    body: JSON.stringify({ email: 'user@example.com', password: '', pin: '123456' }),
  }));
});

test('stores the six-digit code for the signed-in account', async () => {
  const fetcher = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ user: { id: 'user-1', email: 'user@example.com', name: 'User', hasPin: true } }),
  });

  await expect(setAccountPin('signed-session-token', '123456', fetcher as typeof fetch))
    .resolves.toEqual({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      hasPin: true,
      demoPortfolioSpec: '',
    });
  expect(fetcher).toHaveBeenCalledWith(`${API_BASE_URL}/api/auth/pin`, expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({ pin: '123456' }),
  }));
});
