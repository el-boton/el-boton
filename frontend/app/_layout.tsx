import { useEffect, useState } from 'react';
import { useColorScheme, Alert, Platform, NativeModules, AppState } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { TamaguiProvider, Theme } from 'tamagui';
import 'react-native-reanimated';
import '@/lib/i18n';
import { loadSavedLanguage } from '@/lib/i18n';

import { config } from '../tamagui.config';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

const { SharedKeychainModule } = NativeModules;

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, loading, profile, profileLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [permissionsChecked, setPermissionsChecked] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  // Check permissions status (don't request, just check)
  // Re-check when segments change (user navigated) to catch newly granted permissions
  useEffect(() => {
    if (loading || profileLoading) return;

    (async () => {
      const locStatus = await Location.getForegroundPermissionsAsync();
      setHasLocationPermission(locStatus.status === 'granted');
      setPermissionsChecked(true);
    })();
  }, [loading, profileLoading, segments]);

  // Handle deep links from widget
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const { url } = event;
      if (!url || typeof url !== 'string') return;

      const parsed = Linking.parse(url);
      const path = typeof parsed.path === 'string' ? parsed.path : '';

      // Handle alert deep links: elboton://alert/{id}
      if (path.startsWith('alert/')) {
        const alertId = path.replace('alert/', '');
        if (alertId && user) {
          router.push(`/alert/${alertId}`);
        }
        return;
      }

      // Handle error deep links from widget: elboton://error?type=...
      if (path === 'error' && parsed.queryParams?.type) {
        const errorType = parsed.queryParams.type;
        let errorMessage = 'An error occurred';

        switch (errorType) {
          case 'location':
            errorMessage = 'Unable to get your location. Please check location permissions.';
            break;
          case 'auth':
            errorMessage = 'Session expired. Please sign in again.';
            break;
          case 'api':
            errorMessage = 'Failed to create alert. Please try again.';
            break;
        }

        Alert.alert('Widget Error', errorMessage);
        return;
      }

      // Handle login redirect from widget: elboton://login
      if (path === 'login') {
        if (!user) {
          router.replace('/(auth)/login');
        }
        return;
      }
    };

    // Get initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // Listen for deep links while app is open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => subscription.remove();
  }, [user, router]);

  // Handle pending actions from iOS widget (stored in shared UserDefaults)
  useEffect(() => {
    if (Platform.OS !== 'ios' || !SharedKeychainModule?.getPendingAction) return;

    const checkPendingAction = async () => {
      try {
        const action = await SharedKeychainModule.getPendingAction();
        if (!action || typeof action !== 'string') return;

        // Clear the pending action immediately
        await SharedKeychainModule.clearPendingAction();

        // Handle different action types
        if (action === 'login') {
          if (!user) {
            router.replace('/(auth)/login');
          }
        } else if (action === 'error_location') {
          Alert.alert('Widget Error', 'Unable to get your location. Please check location permissions.');
        } else if (action === 'error_api') {
          Alert.alert('Widget Error', 'Failed to create alert. Please try again.');
        } else if (action.startsWith('alert_')) {
          const alertId = action.replace('alert_', '');
          if (alertId && user) {
            router.push(`/alert/${alertId}`);
          }
        }
      } catch (e) {
        console.warn('Failed to check pending action:', e);
      }
    };

    // Check on mount
    checkPendingAction();

    // Also check when app comes to foreground
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkPendingAction();
      }
    });

    return () => subscription.remove();
  }, [user, router]);

  useEffect(() => {
    // Wait for auth, profile, and permissions to be checked
    if (loading || profileLoading || !permissionsChecked) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    // Determine which onboarding step is needed (if any)
    // Note: notifications are optional (App Store Guideline 4.5.4) — not gated here
    const needsDisplayName = !profile?.display_name;
    const needsLocation = !hasLocationPermission;
    const onboardingComplete = !needsDisplayName && !needsLocation;

    if (!user && !inAuthGroup) {
      // Not authenticated - go to login
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Authenticated, leaving auth group - check if onboarding needed
      if (needsDisplayName) {
        router.replace('/(onboarding)/welcome');
      } else if (needsLocation) {
        router.replace('/(onboarding)/location');
      } else {
        router.replace('/(tabs)');
      }
    } else if (user && !inOnboardingGroup && !inAuthGroup && !onboardingComplete) {
      // Authenticated but onboarding incomplete, not in onboarding - send to appropriate step
      if (needsDisplayName) {
        router.replace('/(onboarding)/welcome');
      } else if (needsLocation) {
        router.replace('/(onboarding)/location');
      }
    }
    // Note: Don't redirect FROM onboarding - let onboarding screens handle their own navigation
  }, [user, loading, profile, profileLoading, segments, permissionsChecked, hasLocationPermission]);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="alert/[id]"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [languageLoaded, setLanguageLoaded] = useState(false);
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    loadSavedLanguage().then(() => setLanguageLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded && languageLoaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded, languageLoaded]);

  if (!loaded || !languageLoaded) {
    return null;
  }

  return (
    <TamaguiProvider config={config} defaultTheme="dark">
      <Theme name="dark">
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </Theme>
    </TamaguiProvider>
  );
}
