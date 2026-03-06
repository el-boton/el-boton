import { NativeModules, Platform } from 'react-native';

import { AuthSession } from '@/lib/types';

const { SharedPreferencesModule, SharedKeychainModule } = NativeModules;

export async function syncCredentialsToNative(
  session: AuthSession | null
): Promise<void> {
  if (!session) {
    if (Platform.OS === 'android' && SharedPreferencesModule?.clearCredentials) {
      try {
        await SharedPreferencesModule.clearCredentials();
      } catch (error) {
        console.warn('Failed to clear Android widget credentials:', error);
      }
    }

    if (Platform.OS === 'ios' && SharedKeychainModule?.clearCredentials) {
      try {
        await SharedKeychainModule.clearCredentials();
      } catch (error) {
        console.warn('Failed to clear iOS widget credentials:', error);
      }
    }

    return;
  }

  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) {
    return;
  }

  const credentials = {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    userId: session.user.id,
    expiresAt: session.expires_at,
    apiUrl,
  };

  if (Platform.OS === 'android' && SharedPreferencesModule?.syncCredentials) {
    try {
      await SharedPreferencesModule.syncCredentials(credentials);
    } catch (error) {
      console.warn('Failed to sync Android widget credentials:', error);
    }
  }

  if (Platform.OS === 'ios' && SharedKeychainModule?.syncCredentials) {
    try {
      await SharedKeychainModule.syncCredentials(credentials);
    } catch (error) {
      console.warn('Failed to sync iOS widget credentials:', error);
    }
  }
}
