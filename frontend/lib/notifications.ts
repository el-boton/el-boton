import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Linking } from 'react-native';
import { updateMyProfile } from '@/lib/api/profile';

// Configure how notifications are handled when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    throw new Error('Push notifications require a physical device. Please test on a real device.');
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not granted
  // On iOS, request Critical Alert permission for emergency notifications
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowCriticalAlerts: true, // Critical Alerts bypass DND and silent mode
      },
    });
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  // Set up Android notification channel for loud alerts
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alerts', {
      name: 'Emergency Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500, 250, 500],
      lightColor: '#FF0000',
      sound: 'alarm.wav', // Custom sound file in assets
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync('test_alerts', {
      name: 'Test Alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
      bypassDnd: false,
    });
  }

  // Get the push token
  try {
    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
    console.log('Getting push token with projectId:', projectId);

    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    console.log('Push token obtained:', token.data);
    return token.data;
  } catch (error) {
    console.error('Failed to get push token:', error);
    throw error;
  }
}

export async function savePushToken(token: string): Promise<void> {
  await updateMyProfile({ push_token: token });
}

export async function sendLocalAlertNotification(
  senderName: string,
  alertId: string
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'EMERGENCY ALERT',
      body: `${senderName} needs help!`,
      sound: 'alarm.wav',
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: { alertId, type: 'emergency' },
      // iOS Critical Alert settings - bypasses DND and silent mode
      interruptionLevel: 'critical',
    },
    trigger: null, // Immediate
  });
}

/**
 * Send a Critical Alert notification that bypasses DND and silent mode.
 * Use this for genuine emergencies only - Apple monitors Critical Alert usage.
 */
export async function sendCriticalAlertNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const notificationContent: Notifications.NotificationContentInput = {
    title,
    body,
    data: { ...data, type: 'critical_emergency' },
    // iOS Critical Alert - bypasses DND, plays at volume even when muted
    interruptionLevel: 'critical',
    sound: 'alarm.wav',
    priority: Notifications.AndroidNotificationPriority.MAX,
  };

  // On Android, use the alerts channel which has bypassDnd enabled
  if (Platform.OS === 'android') {
    await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: {
        channelId: 'alerts',
      },
    });
  } else {
    await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: null,
    });
  }
}

export function addNotificationListener(
  handler: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(handler);
}

export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

/**
 * Opens Android DND settings so user can grant notification policy access.
 * This is required for bypassDnd to work on Android 13+.
 * On iOS, this is a no-op (Critical Alerts handle this).
 */
export async function requestDndAccess(): Promise<void> {
  if (Platform.OS === 'android') {
    await Linking.openSettings();
  }
}

/**
 * Opens the app's notification settings where users can manage
 * Critical Alert permissions (iOS) or notification channel settings (Android).
 */
export async function openNotificationSettings(): Promise<void> {
  if (Platform.OS === 'ios') {
    await Linking.openURL('app-settings:');
  } else {
    await Linking.openSettings();
  }
}
