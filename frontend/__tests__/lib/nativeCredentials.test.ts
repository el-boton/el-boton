type NativeModuleMap = {
  SharedKeychainModule?: {
    clearCredentials?: jest.Mock;
    syncCredentials?: jest.Mock;
  };
  SharedPreferencesModule?: {
    clearCredentials?: jest.Mock;
    syncCredentials?: jest.Mock;
  };
};

const session = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_at: 1_700_000_000,
  user: {
    id: 'user-123',
    phone: '+15551234567',
  },
};

function loadModule(
  os: 'android' | 'ios',
  nativeModules: NativeModuleMap
) {
  jest.resetModules();
  jest.doMock('react-native', () => ({
    NativeModules: nativeModules,
    Platform: {
      OS: os,
      select: (options: Record<string, unknown>) => options[os] ?? options.default,
    },
  }));

  return require('@/lib/nativeCredentials') as typeof import('@/lib/nativeCredentials');
}

describe('syncCredentialsToNative', () => {
  const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
  });

  it('syncs widget credentials to Android native storage', async () => {
    const syncCredentials = jest.fn().mockResolvedValue(undefined);
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com';

    const { syncCredentialsToNative } = loadModule('android', {
      SharedPreferencesModule: { syncCredentials },
    });

    await syncCredentialsToNative(session);

    expect(syncCredentials).toHaveBeenCalledWith({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      userId: session.user.id,
      expiresAt: session.expires_at,
      apiUrl: 'https://api.example.com',
    });
  });

  it('clears iOS widget credentials when the session is removed', async () => {
    const clearCredentials = jest.fn().mockResolvedValue(undefined);
    const { syncCredentialsToNative } = loadModule('ios', {
      SharedKeychainModule: { clearCredentials },
    });

    await syncCredentialsToNative(null);

    expect(clearCredentials).toHaveBeenCalledTimes(1);
  });

  it('skips syncing when the backend URL is missing', async () => {
    const syncCredentials = jest.fn().mockResolvedValue(undefined);
    delete process.env.EXPO_PUBLIC_API_URL;

    const { syncCredentialsToNative } = loadModule('android', {
      SharedPreferencesModule: { syncCredentials },
    });

    await syncCredentialsToNative(session);

    expect(syncCredentials).not.toHaveBeenCalled();
  });
});
