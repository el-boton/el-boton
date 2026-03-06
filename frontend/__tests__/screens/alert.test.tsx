import React from 'react';
import { Alert as RNAlert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import AlertScreen from '@/app/alert/[id]';
import * as alerts from '@/lib/alerts';

jest.spyOn(RNAlert, 'alert').mockImplementation(() => {});

jest.mock('@/lib/alerts', () => ({
  cancelAlert: jest.fn(),
  resolveAlert: jest.fn(),
  expandToNearby: jest.fn(),
  respondToAlert: jest.fn(),
  subscribeToAlert: jest.fn(() => ({ unsubscribe: jest.fn() })),
  subscribeToResponses: jest.fn((_alertId, callback) => {
    callback([]);
    return { unsubscribe: jest.fn() };
  }),
  subscribeToMessages: jest.fn((_alertId, callback) => {
    callback([]);
    return { unsubscribe: jest.fn() };
  }),
  sendMessage: jest.fn(),
  getMessages: jest.fn().mockResolvedValue([]),
  getAlertById: jest.fn(),
  getResponses: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/contexts/AuthContext', () => ({
  ...jest.requireActual('@/contexts/AuthContext'),
  useAuth: () => ({
    user: { id: 'test-user-id' },
    loading: false,
  }),
}));

const mockGetAlertById = alerts.getAlertById as jest.MockedFunction<
  typeof alerts.getAlertById
>;
const mockRespondToAlert = alerts.respondToAlert as jest.MockedFunction<
  typeof alerts.respondToAlert
>;
const mockResolveAlert = alerts.resolveAlert as jest.MockedFunction<
  typeof alerts.resolveAlert
>;

const baseAlert = {
  id: 'test-alert-id',
  sender_id: 'other-user-id',
  latitude: 37.7749,
  longitude: -122.4194,
  geohash: '9q8yyk',
  status: 'active' as const,
  expand_to_nearby: false,
  created_at: new Date().toISOString(),
  resolved_at: null,
};

describe('Alert Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (RNAlert.alert as jest.Mock).mockClear();
  });

  it('calls respondToAlert for responder actions', async () => {
    mockGetAlertById.mockResolvedValue(baseAlert);

    const { findByText, getByText } = render(<AlertScreen />);

    await findByText('EN ROUTE');

    fireEvent.press(getByText('EN ROUTE'));
    expect(mockRespondToAlert).toHaveBeenCalledWith('test-alert-id', 'en_route');

    fireEvent.press(getByText('ARRIVED'));
    expect(mockRespondToAlert).toHaveBeenCalledWith('test-alert-id', 'arrived');
  });

  it('shows sender actions and resolves the alert', async () => {
    mockGetAlertById.mockResolvedValue({
      ...baseAlert,
      sender_id: 'test-user-id',
    });
    mockResolveAlert.mockResolvedValue(true);

    const { findByText, getByText } = render(<AlertScreen />);

    await findByText("I'm Safe");

    fireEvent.press(getByText("I'm Safe"));

    await waitFor(() => {
      expect(mockResolveAlert).toHaveBeenCalledWith('test-alert-id');
      expect(router.back).toHaveBeenCalled();
    });
  });

  it('prompts before expanding the alert', async () => {
    mockGetAlertById.mockResolvedValue({
      ...baseAlert,
      sender_id: 'test-user-id',
    });

    const { findByText, getByText } = render(<AlertScreen />);

    await findByText('Expand to Nearby Users');

    fireEvent.press(getByText('Expand to Nearby Users'));

    expect(RNAlert.alert).toHaveBeenCalledWith(
      'Expand to Nearby',
      expect.any(String),
      expect.any(Array)
    );
  });
});
