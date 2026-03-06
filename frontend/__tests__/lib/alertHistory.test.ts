import { ApiError } from '@/lib/api/http';
import * as alertsApi from '@/lib/api/alerts';
import * as realtimeApi from '@/lib/api/realtime';
import { getInvolvedAlerts, subscribeToInvolvedAlerts } from '@/lib/alertHistory';

const mockGetAlertHistory = alertsApi.getAlertHistory as jest.MockedFunction<
  typeof alertsApi.getAlertHistory
>;
const mockSubscribeToUserAlertsChannel =
  realtimeApi.subscribeToUserAlertsChannel as jest.MockedFunction<
    typeof realtimeApi.subscribeToUserAlertsChannel
  >;

describe('alertHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getInvolvedAlerts', () => {
    it('returns alert history from the backend client', async () => {
      const alerts = [
        {
          id: 'alert-1',
          sender_id: 'user-1',
          latitude: 37.7749,
          longitude: -122.4194,
          geohash: '9q8yyk',
          status: 'active' as const,
          expand_to_nearby: false,
          created_at: new Date().toISOString(),
          resolved_at: null,
          sender: { display_name: 'Test User' },
        },
      ];

      mockGetAlertHistory.mockResolvedValue(alerts);

      await expect(getInvolvedAlerts('user-1')).resolves.toEqual(alerts);
    });

    it('returns an empty array on 401 responses', async () => {
      mockGetAlertHistory.mockRejectedValue(
        new ApiError('Unauthorized', 401, 'unauthorized')
      );

      await expect(getInvolvedAlerts('user-1')).resolves.toEqual([]);
    });

    it('rethrows non-auth errors', async () => {
      mockGetAlertHistory.mockRejectedValue(new Error('Boom'));

      await expect(getInvolvedAlerts('user-1')).rejects.toThrow('Boom');
    });
  });

  describe('subscribeToInvolvedAlerts', () => {
    it('subscribes to the user alerts channel', () => {
      const onUpdate = jest.fn();
      const subscription = { unsubscribe: jest.fn() };
      mockSubscribeToUserAlertsChannel.mockReturnValue(subscription);

      const result = subscribeToInvolvedAlerts('user-1', onUpdate);

      expect(mockSubscribeToUserAlertsChannel).toHaveBeenCalledWith(
        'user-1',
        onUpdate
      );
      expect(result).toBe(subscription);
    });
  });
});
