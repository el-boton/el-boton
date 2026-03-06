import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import LoginScreen from '@/app/(auth)/login';
import * as authApi from '@/lib/api/auth';

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
}));

const mockRequestOtp = authApi.requestOtp as jest.MockedFunction<
  typeof authApi.requestOtp
>;
const mockVerifyOtp = authApi.verifyOtp as jest.MockedFunction<
  typeof authApi.verifyOtp
>;

describe('Login Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestOtp.mockResolvedValue();
    mockVerifyOtp.mockResolvedValue({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: 'test-user-id', phone: '+15551234567' },
    });
  });

  it('renders phone input initially', () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    expect(getByText('EL BOTÓN')).toBeTruthy();
    expect(getByText('Phone Number')).toBeTruthy();
    expect(getByPlaceholderText('(555) 123-4567')).toBeTruthy();
    expect(getByText('Send Verification Code')).toBeTruthy();
  });

  it('formats phone number as user types', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);

    const input = getByPlaceholderText('(555) 123-4567');
    fireEvent.changeText(input, '5551234567');

    expect(input.props.value).toBe('(555) 123-4567');
  });

  it('shows error for invalid phone number', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('(555) 123-4567'), '123');
    fireEvent.press(getByText('Send Verification Code'));

    await waitFor(() => {
      expect(getByText('Please enter a valid phone number')).toBeTruthy();
    });
  });

  it('sends OTP on valid phone submission', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('(555) 123-4567'), '5551234567');

    await act(async () => {
      fireEvent.press(getByText('Send Verification Code'));
    });

    expect(mockRequestOtp).toHaveBeenCalledWith('+15551234567');
  });

  it('shows OTP input after sending code', async () => {
    const { findByPlaceholderText, getByPlaceholderText, getByText } = render(
      <LoginScreen />
    );

    fireEvent.changeText(getByPlaceholderText('(555) 123-4567'), '5551234567');

    await act(async () => {
      fireEvent.press(getByText('Send Verification Code'));
    });

    expect(await findByPlaceholderText('000000')).toBeTruthy();
    expect(getByText(/Enter the 6-digit code sent to/)).toBeTruthy();
    expect(getByText('Verify & Continue')).toBeTruthy();
  });

  it('shows error on OTP send failure', async () => {
    mockRequestOtp.mockRejectedValue(new Error('Rate limit exceeded'));

    const { findByText, getByPlaceholderText, getByText } = render(
      <LoginScreen />
    );

    fireEvent.changeText(getByPlaceholderText('(555) 123-4567'), '5551234567');

    await act(async () => {
      fireEvent.press(getByText('Send Verification Code'));
    });

    expect(await findByText('Rate limit exceeded')).toBeTruthy();
  });

  it('verifies OTP and redirects on success', async () => {
    const { router } = require('expo-router');
    const { findByPlaceholderText, getByPlaceholderText, getByText } = render(
      <LoginScreen />
    );

    fireEvent.changeText(getByPlaceholderText('(555) 123-4567'), '5551234567');

    await act(async () => {
      fireEvent.press(getByText('Send Verification Code'));
    });

    fireEvent.changeText(await findByPlaceholderText('000000'), '123456');

    await act(async () => {
      fireEvent.press(getByText('Verify & Continue'));
    });

    expect(mockVerifyOtp).toHaveBeenCalledWith('+15551234567', '123456');
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('shows error on invalid OTP', async () => {
    mockVerifyOtp.mockRejectedValue(new Error('Invalid OTP'));

    const { findByPlaceholderText, findByText, getByPlaceholderText, getByText } =
      render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('(555) 123-4567'), '5551234567');

    await act(async () => {
      fireEvent.press(getByText('Send Verification Code'));
    });

    fireEvent.changeText(await findByPlaceholderText('000000'), '000000');

    await act(async () => {
      fireEvent.press(getByText('Verify & Continue'));
    });

    expect(await findByText('Invalid OTP')).toBeTruthy();
  });

  it('allows going back to phone input', async () => {
    const { findByPlaceholderText, findByText, getByPlaceholderText, getByText } =
      render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('(555) 123-4567'), '5551234567');

    await act(async () => {
      fireEvent.press(getByText('Send Verification Code'));
    });

    await findByPlaceholderText('000000');

    fireEvent.press(await findByText('Use a different number'));

    expect(getByPlaceholderText('(555) 123-4567')).toBeTruthy();
    expect(getByText('Send Verification Code')).toBeTruthy();
  });
});
