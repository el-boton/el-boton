import * as alertsApi from '@/lib/api/alerts';
import {
  cancelAlert,
  createAlert,
  resolveAlert,
  respondToAlert,
} from '@/lib/alerts';

const mockCreateAlertRequest =
  alertsApi.createAlertRequest as jest.MockedFunction<
    typeof alertsApi.createAlertRequest
  >;
const mockCancelAlert = alertsApi.cancelAlert as jest.MockedFunction<
  typeof alertsApi.cancelAlert
>;
const mockResolveAlert = alertsApi.resolveAlert as jest.MockedFunction<
  typeof alertsApi.resolveAlert
>;
const mockRespondToAlertRequest =
  alertsApi.respondToAlertRequest as jest.MockedFunction<
    typeof alertsApi.respondToAlertRequest
  >;

describe('alerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAlert', () => {
    it('creates an alert successfully', async () => {
      mockCreateAlertRequest.mockResolvedValue({
        id: 'test-alert-id',
        sender_id: 'test-user-id',
        latitude: 37.7749,
        longitude: -122.4194,
        geohash: '9q8yyk',
        status: 'active',
        expand_to_nearby: false,
        created_at: new Date().toISOString(),
        resolved_at: null,
      });

      const result = await createAlert(37.7749, -122.4194, true);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.alert.id).toBe('test-alert-id');
        expect(result.alert.status).toBe('active');
      }
    });

    it('returns an error when the request fails', async () => {
      mockCreateAlertRequest.mockRejectedValue(new Error('Not authenticated'));

      const result = await createAlert(37.7749, -122.4194, true);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Not authenticated');
      }
    });

    it('returns backend error messages', async () => {
      mockCreateAlertRequest.mockRejectedValue(new Error('Database error'));

      const result = await createAlert(37.7749, -122.4194, true);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Database error');
      }
    });
  });

  describe('cancelAlert', () => {
    it('cancels an alert successfully', async () => {
      mockCancelAlert.mockResolvedValue();

      await expect(cancelAlert('test-alert-id')).resolves.toBe(true);
    });

    it('returns false on failure', async () => {
      mockCancelAlert.mockRejectedValue(new Error('Error'));

      await expect(cancelAlert('test-alert-id')).resolves.toBe(false);
    });
  });

  describe('resolveAlert', () => {
    it('resolves an alert successfully', async () => {
      mockResolveAlert.mockResolvedValue();

      await expect(resolveAlert('test-alert-id')).resolves.toBe(true);
    });
  });

  describe('respondToAlert', () => {
    it('responds to an alert successfully', async () => {
      mockRespondToAlertRequest.mockResolvedValue();

      await expect(
        respondToAlert('test-alert-id', 'en_route')
      ).resolves.toBe(true);
    });

    it('returns false when the request fails', async () => {
      mockRespondToAlertRequest.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        respondToAlert('test-alert-id', 'acknowledged')
      ).resolves.toBe(false);
    });

    it('supports all responder status transitions', async () => {
      mockRespondToAlertRequest.mockResolvedValue();

      await respondToAlert('test-alert-id', 'acknowledged');
      await respondToAlert('test-alert-id', 'en_route');
      await respondToAlert('test-alert-id', 'arrived');

      expect(mockRespondToAlertRequest).toHaveBeenNthCalledWith(
        1,
        'test-alert-id',
        'acknowledged'
      );
      expect(mockRespondToAlertRequest).toHaveBeenNthCalledWith(
        2,
        'test-alert-id',
        'en_route'
      );
      expect(mockRespondToAlertRequest).toHaveBeenNthCalledWith(
        3,
        'test-alert-id',
        'arrived'
      );
    });
  });
});
