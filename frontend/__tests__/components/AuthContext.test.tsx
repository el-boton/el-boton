import React from 'react';
import { Text } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import * as authApi from '@/lib/api/auth';
import * as profileApi from '@/lib/api/profile';
import { AuthChangeEvent, AuthSession } from '@/lib/types';

const mockGetSession = authApi.getSession as jest.MockedFunction<
  typeof authApi.getSession
>;
const mockOnAuthStateChange = authApi.onAuthStateChange as jest.MockedFunction<
  typeof authApi.onAuthStateChange
>;
const mockSignOut = authApi.signOut as jest.MockedFunction<typeof authApi.signOut>;
const mockGetMyProfile = profileApi.getMyProfile as jest.MockedFunction<
  typeof profileApi.getMyProfile
>;

const TestConsumer = () => {
  const { user, loading } = useAuth();

  return (
    <>
      <Text testID="loading">{loading ? 'loading' : 'ready'}</Text>
      <Text testID="user">{user ? user.id : 'no-user'}</Text>
    </>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMyProfile.mockResolvedValue(null);
    mockOnAuthStateChange.mockReturnValue({
      unsubscribe: jest.fn(),
    });
  });

  it('starts in loading state', () => {
    mockGetSession.mockReturnValue(new Promise(() => {}));

    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(getByTestId('loading').props.children).toBe('loading');
  });

  it('sets user when session exists', async () => {
    mockGetSession.mockResolvedValue({
      access_token: 'token',
      refresh_token: 'refresh',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: 'test-user-123', phone: '+15551234567' },
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('ready');
    });

    expect(getByTestId('user').props.children).toBe('test-user-123');
  });

  it('sets user to null when no session', async () => {
    mockGetSession.mockResolvedValue(null);

    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('ready');
    });

    expect(getByTestId('user').props.children).toBe('no-user');
  });

  it('updates user on auth state change', async () => {
    let authStateCallback:
      | ((event: AuthChangeEvent, session: AuthSession | null) => void)
      | undefined;

    mockGetSession.mockResolvedValue(null);
    mockOnAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return { unsubscribe: jest.fn() };
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('user').props.children).toBe('no-user');
    });

    act(() => {
      authStateCallback?.('SIGNED_IN', {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: 'new-user-456', phone: '+15551234567' },
      });
    });

    await waitFor(() => {
      expect(getByTestId('user').props.children).toBe('new-user-456');
    });
  });

  it('calls signOut on the auth client', async () => {
    mockGetSession.mockResolvedValue({
      access_token: 'token',
      refresh_token: 'refresh',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: 'test-user-id', phone: '+15551234567' },
    });
    mockSignOut.mockResolvedValue();

    let signOutFn: (() => Promise<void>) | undefined;

    const TestWithSignOut = () => {
      const { signOut } = useAuth();
      signOutFn = signOut;
      return null;
    };

    render(
      <AuthProvider>
        <TestWithSignOut />
      </AuthProvider>
    );

    await act(async () => {
      await signOutFn?.();
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('unsubscribes on unmount', () => {
    const unsubscribe = jest.fn();
    mockGetSession.mockResolvedValue(null);
    mockOnAuthStateChange.mockReturnValue({ unsubscribe });

    const { unmount } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
