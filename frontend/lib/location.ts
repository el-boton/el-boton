import * as Location from 'expo-location';
import { Platform } from 'react-native';
import * as NativeLocation from '@/modules/native-location';

/**
 * Get location with timeout and fallbacks.
 * On Android: tries native LocationManager first (works without Play Services),
 * then falls back to expo-location.
 * On iOS: uses expo-location directly.
 */
export async function getLocationWithFallback(
  timeoutMs = 15000
): Promise<Location.LocationObject> {
  // On Android, try native first, then fall back to expo-location
  if (Platform.OS === 'android') {
    try {
      return await getLocationNative(timeoutMs);
    } catch (e) {
      console.log('[Location] Native failed, falling back to expo-location:', e);
    }
  }

  return getLocationExpo(timeoutMs);
}

/**
 * Native Android location using LocationManager (no Play Services required)
 */
async function getLocationNative(timeoutMs: number): Promise<Location.LocationObject> {
  console.log('[Location] Using native LocationManager...');

  try {
    const result = await NativeLocation.getCurrentPosition(timeoutMs);
    console.log('[Location] Native location succeeded');
    return {
      coords: {
        latitude: result.latitude,
        longitude: result.longitude,
        altitude: result.altitude,
        accuracy: result.accuracy,
        altitudeAccuracy: null,
        heading: null,
        speed: result.speed,
      },
      timestamp: result.timestamp,
    };
  } catch (e) {
    console.log('[Location] Native getCurrentPosition failed:', e);
  }

  // Try last known
  try {
    const lastKnown = await NativeLocation.getLastKnownPosition();
    if (lastKnown) {
      console.log('[Location] Native last known succeeded');
      return {
        coords: {
          latitude: lastKnown.latitude,
          longitude: lastKnown.longitude,
          altitude: lastKnown.altitude,
          accuracy: lastKnown.accuracy,
          altitudeAccuracy: null,
          heading: null,
          speed: lastKnown.speed,
        },
        timestamp: lastKnown.timestamp,
      };
    }
  } catch (e) {
    console.log('[Location] Native last known failed:', e);
  }

  throw new Error('Native location unavailable');
}

/**
 * Expo location (uses Play Services on Android, CoreLocation on iOS)
 */
async function getLocationExpo(timeoutMs: number): Promise<Location.LocationObject> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Location timeout')), timeoutMs)
  );

  try {
    console.log('[Location] Trying expo-location...');
    const loc = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      }),
      timeoutPromise,
    ]);
    console.log('[Location] Expo location succeeded');
    return loc;
  } catch (e) {
    console.log('[Location] Expo location failed:', e);
  }

  // Fall back to last known
  const lastKnown = await Location.getLastKnownPositionAsync();
  if (lastKnown) {
    console.log('[Location] Expo last known succeeded');
    return lastKnown;
  }

  throw new Error('Could not get location');
}
