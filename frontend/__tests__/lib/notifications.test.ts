import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import * as profileApi from '@/lib/api/profile';
import {
  registerForPushNotifications,
  savePushToken,
  sendLocalAlertNotification,
} from '@/lib/notifications';

const mockUpdateMyProfile = profileApi.updateMyProfile as jest.MockedFunction<
  typeof profileApi.updateMyProfile
>;

describe('notifications', () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Device, 'isDevice', {
      configurable: true,
      value: true,
    });
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('registerForPushNotifications', () => {
    it('returns a push token when permissions are granted', async () => {
      await expect(registerForPushNotifications()).resolves.toBe(
        'ExponentPushToken[test]'
      );
    });

    it('returns null when permission is denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });

      await expect(registerForPushNotifications()).resolves.toBeNull();
    });

    it('requests permissions if not already granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });

      await registerForPushNotifications();

      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });
  });

  describe('savePushToken', () => {
    it('stores the push token on the current profile', async () => {
      await savePushToken('ExponentPushToken[test]');

      expect(mockUpdateMyProfile).toHaveBeenCalledWith({
        push_token: 'ExponentPushToken[test]',
      });
    });
  });

  describe('sendLocalAlertNotification', () => {
    it('schedules a notification with the correct content', async () => {
      await sendLocalAlertNotification('John', 'alert-123');

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'EMERGENCY ALERT',
          body: 'John needs help!',
          sound: 'alarm.wav',
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: { alertId: 'alert-123', type: 'emergency' },
          interruptionLevel: 'critical',
        },
        trigger: null,
      });
    });
  });
});
