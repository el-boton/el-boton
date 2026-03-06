import { Platform } from 'react-native';

export interface NativeLocationResult {
  latitude: number;
  longitude: number;
  altitude: number;
  accuracy: number;
  speed: number;
  timestamp: number;
}

let NativeLocation: any = null;

if (Platform.OS === 'android') {
  try {
    const { requireNativeModule } = require('expo-modules-core');
    NativeLocation = requireNativeModule('NativeLocation');
  } catch (e) {
    console.warn('[NativeLocation] Module not available — falling back to expo-location:', (e as Error).message);
  }
}

export async function getCurrentPosition(timeoutMs: number = 15000): Promise<NativeLocationResult> {
  if (!NativeLocation) {
    throw new Error('NativeLocation is not available');
  }
  return await NativeLocation.getCurrentPosition(timeoutMs);
}

export async function getLastKnownPosition(): Promise<NativeLocationResult | null> {
  if (!NativeLocation) {
    throw new Error('NativeLocation is not available');
  }
  return await NativeLocation.getLastKnownPosition();
}
