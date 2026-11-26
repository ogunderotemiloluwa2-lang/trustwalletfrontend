import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PasscodeLogin from './PasscodeLogin';

const mockNavigate = jest.fn();
const mockUnlockWithVerifiedPin = jest.fn();
const mockUpdateSessionPin = jest.fn();
const mockLockWithPassword = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('../services/authApi', () => ({
  loginAccount: jest.fn(),
  setAccountPin: jest.fn(),
}));

jest.mock('../services/authSession', () => ({
  saveAccountSession: jest.fn(),
  clearAccountSession: jest.fn(),
}));

jest.mock('../wallet/WalletSetupContext', () => ({
  useWalletSetup: () => ({
    unlockWithVerifiedPin: mockUnlockWithVerifiedPin,
    updateSessionPin: mockUpdateSessionPin,
    lockWithPassword: mockLockWithPassword,
  }),
}));

const { loginAccount, setAccountPin } = jest.requireMock('../services/authApi');
const { clearAccountSession } = jest.requireMock('../services/authSession');

const typeCode = (label: string, code: string) => {
  fireEvent.change(screen.getByLabelText(`${label} digit 1`), { target: { value: code } });
};

beforeEach(() => {
  jest.clearAllMocks();
});

test('the back arrow signs out and returns to the password screen', () => {
  render(<PasscodeLogin />);

  fireEvent.click(screen.getByRole('button', { name: 'Back to sign in' }));

  expect(clearAccountSession).toHaveBeenCalled();
  expect(mockLockWithPassword).toHaveBeenCalled();
  expect(mockNavigate).toHaveBeenCalledWith('/account', { replace: true });
});

test('resets the code on the account after confirming the wallet password', async () => {
  loginAccount.mockResolvedValue({ token: 'token-1', user: { id: '1', name: 'Owner', hasPin: true, balance: 0 } });
  setAccountPin.mockResolvedValue({ id: '1', name: 'Owner', hasPin: true, balance: 0 });

  render(<PasscodeLogin />);
  fireEvent.click(screen.getByRole('button', { name: /forgot your code/i }));

  fireEvent.change(screen.getByLabelText('Wallet password'), { target: { value: 'correct horse' } });
  typeCode('New six-digit code', '654321');
  typeCode('Confirm new six-digit code', '654321');
  fireEvent.click(screen.getByRole('button', { name: 'Save new code' }));

  await waitFor(() => expect(setAccountPin).toHaveBeenCalledWith('token-1', '654321'));
  expect(loginAccount).toHaveBeenCalledWith({ password: 'correct horse' });
  expect(mockUpdateSessionPin).toHaveBeenCalledWith('654321');
  expect(await screen.findByText(/has been updated/i)).toBeInTheDocument();
});

test('refuses to save when the two codes do not match', async () => {
  render(<PasscodeLogin />);
  fireEvent.click(screen.getByRole('button', { name: /forgot your code/i }));

  fireEvent.change(screen.getByLabelText('Wallet password'), { target: { value: 'correct horse' } });
  typeCode('New six-digit code', '654321');
  typeCode('Confirm new six-digit code', '123456');
  fireEvent.click(screen.getByRole('button', { name: 'Save new code' }));

  expect(await screen.findByText('The two codes do not match.')).toBeInTheDocument();
  expect(setAccountPin).not.toHaveBeenCalled();
});
