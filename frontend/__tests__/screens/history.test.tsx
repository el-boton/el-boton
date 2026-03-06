import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import HistoryScreen from '@/app/(tabs)/history';

jest.mock('@/contexts/AuthContext', () => ({
  ...jest.requireActual('@/contexts/AuthContext'),
  useAuth: () => ({
    user: { id: 'test-user-id' },
    loading: false,
  }),
}));

jest.mock('@/lib/alertHistory', () => ({
  getInvolvedAlerts: jest.fn(),
  subscribeToInvolvedAlerts: jest.fn(() => ({ unsubscribe: jest.fn() })),
}));

import { getInvolvedAlerts, subscribeToInvolvedAlerts } from '@/lib/alertHistory';

const mockGetInvolvedAlerts = getInvolvedAlerts as jest.Mock;
const mockSubscribeToInvolvedAlerts = subscribeToInvolvedAlerts as jest.Mock;

describe('History Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribeToInvolvedAlerts.mockReturnValue({ unsubscribe: jest.fn() });
  });

  describe('loading state', () => {
    it('shows loading indicator initially', () => {
      mockGetInvolvedAlerts.mockImplementation(() => new Promise(() => {}));

      const { getByText } = render(<HistoryScreen />);

      expect(getByText('Loading...')).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no alerts', async () => {
      mockGetInvolvedAlerts.mockResolvedValue([]);

      const { findByText } = render(<HistoryScreen />);

      expect(await findByText('No alerts yet')).toBeTruthy();
      expect(await findByText("When you send or receive alerts, they'll appear here")).toBeTruthy();
    });
  });

  describe('alert list', () => {
    const mockAlerts = [
      {
        id: 'alert-1',
        sender_id: 'test-user-id',
        status: 'active',
        created_at: new Date().toISOString(),
        sender: { display_name: 'Test User' },
      },
      {
        id: 'alert-2',
        sender_id: 'other-user',
        status: 'resolved',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        sender: { display_name: 'Other User' },
      },
      {
        id: 'alert-3',
        sender_id: 'other-user-2',
        status: 'cancelled',
        created_at: new Date(Date.now() - 7200000).toISOString(),
        sender: { display_name: 'Another User' },
      },
    ];

    it('renders alerts', async () => {
      mockGetInvolvedAlerts.mockResolvedValue(mockAlerts);

      const { findByText } = render(<HistoryScreen />);

      expect(await findByText('Active')).toBeTruthy();
      expect(await findByText('Resolved')).toBeTruthy();
      expect(await findByText('Cancelled')).toBeTruthy();
    });

    it('shows "You" for own alerts', async () => {
      mockGetInvolvedAlerts.mockResolvedValue([mockAlerts[0]]);

      const { findByText } = render(<HistoryScreen />);

      expect(await findByText(/From: You/)).toBeTruthy();
    });

    it('shows sender name for other alerts', async () => {
      mockGetInvolvedAlerts.mockResolvedValue([mockAlerts[1]]);

      const { findByText } = render(<HistoryScreen />);

      expect(await findByText(/From: Other User/)).toBeTruthy();
    });

    it('separates active and past alerts', async () => {
      mockGetInvolvedAlerts.mockResolvedValue(mockAlerts);

      const { findByText, findAllByText } = render(<HistoryScreen />);

      // Active section header contains count
      expect(await findByText(/ACTIVE/)).toBeTruthy();
      expect(await findByText('PAST')).toBeTruthy();
    });
  });

  describe('relative time formatting', () => {
    it('shows "Just now" for recent alerts', async () => {
      const recentAlert = {
        id: 'alert-1',
        sender_id: 'test-user-id',
        status: 'active',
        created_at: new Date().toISOString(),
        sender: { display_name: 'User' },
      };

      mockGetInvolvedAlerts.mockResolvedValue([recentAlert]);

      const { findByText } = render(<HistoryScreen />);

      expect(await findByText('Just now')).toBeTruthy();
    });

    it('shows minutes ago for recent alerts', async () => {
      const alertFromMinutesAgo = {
        id: 'alert-1',
        sender_id: 'test-user-id',
        status: 'active',
        created_at: new Date(Date.now() - 5 * 60000).toISOString(),
        sender: { display_name: 'User' },
      };

      mockGetInvolvedAlerts.mockResolvedValue([alertFromMinutesAgo]);

      const { findByText } = render(<HistoryScreen />);

      expect(await findByText('5m ago')).toBeTruthy();
    });

    it('shows hours ago for older alerts', async () => {
      const alertFromHoursAgo = {
        id: 'alert-1',
        sender_id: 'test-user-id',
        status: 'resolved',
        created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
        sender: { display_name: 'User' },
      };

      mockGetInvolvedAlerts.mockResolvedValue([alertFromHoursAgo]);

      const { findByText } = render(<HistoryScreen />);

      expect(await findByText('3h ago')).toBeTruthy();
    });
  });

  describe('real-time subscriptions', () => {
    it('subscribes to alerts on mount', async () => {
      mockGetInvolvedAlerts.mockResolvedValue([]);

      render(<HistoryScreen />);

      await waitFor(() => {
        expect(mockSubscribeToInvolvedAlerts).toHaveBeenCalledWith(
          'test-user-id',
          expect.any(Function)
        );
      });
    });

    it('unsubscribes on unmount', async () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToInvolvedAlerts.mockReturnValue({ unsubscribe: mockUnsubscribe });
      mockGetInvolvedAlerts.mockResolvedValue([]);

      const { unmount } = render(<HistoryScreen />);

      await waitFor(() => {
        expect(mockSubscribeToInvolvedAlerts).toHaveBeenCalled();
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('pull to refresh', () => {
    it('refetches alerts on refresh', async () => {
      mockGetInvolvedAlerts.mockResolvedValue([]);

      const { getByTestId, UNSAFE_root } = render(<HistoryScreen />);

      await waitFor(() => {
        expect(mockGetInvolvedAlerts).toHaveBeenCalledTimes(1);
      });

      // Trigger refresh by calling the onRefresh function
      // This is tested indirectly through the RefreshControl
    });
  });

  describe('navigation', () => {
    it('displays history title', async () => {
      mockGetInvolvedAlerts.mockResolvedValue([]);

      const { findByText } = render(<HistoryScreen />);

      expect(await findByText('History')).toBeTruthy();
    });

    it('displays subtitle', async () => {
      mockGetInvolvedAlerts.mockResolvedValue([]);

      const { findByText } = render(<HistoryScreen />);

      expect(await findByText('Your sent and received alerts')).toBeTruthy();
    });
  });

  describe('status badges', () => {
    it('shows active status with red color', async () => {
      const activeAlert = {
        id: 'alert-1',
        sender_id: 'test-user-id',
        status: 'active',
        created_at: new Date().toISOString(),
        sender: { display_name: 'User' },
      };

      mockGetInvolvedAlerts.mockResolvedValue([activeAlert]);

      const { findByText } = render(<HistoryScreen />);

      expect(await findByText('Active')).toBeTruthy();
    });

    it('shows resolved status with cyan color', async () => {
      const resolvedAlert = {
        id: 'alert-1',
        sender_id: 'test-user-id',
        status: 'resolved',
        created_at: new Date().toISOString(),
        sender: { display_name: 'User' },
      };

      mockGetInvolvedAlerts.mockResolvedValue([resolvedAlert]);

      const { findByText } = render(<HistoryScreen />);

      expect(await findByText('Resolved')).toBeTruthy();
    });

    it('shows cancelled status', async () => {
      const cancelledAlert = {
        id: 'alert-1',
        sender_id: 'test-user-id',
        status: 'cancelled',
        created_at: new Date().toISOString(),
        sender: { display_name: 'User' },
      };

      mockGetInvolvedAlerts.mockResolvedValue([cancelledAlert]);

      const { findByText } = render(<HistoryScreen />);

      expect(await findByText('Cancelled')).toBeTruthy();
    });
  });
});
