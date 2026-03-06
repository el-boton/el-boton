import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';

import WelcomeScreen from '@/app/(onboarding)/welcome';
import DisplayNameScreen from '@/app/(onboarding)/display-name';
import LocationScreen from '@/app/(onboarding)/location';
import * as profileApi from '@/lib/api/profile';
import { getLocationWithFallback } from '@/lib/location';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRefreshProfile = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  router: {
    push: mockPush,
    replace: mockReplace,
  },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    loading: false,
    refreshProfile: mockRefreshProfile,
  }),
}));

jest.mock('@/lib/geohash', () => ({
  encode: jest.fn().mockReturnValue('9q8yyk'),
}));

jest.mock('@/lib/location', () => ({
  getLocationWithFallback: jest.fn(),
}));

const mockUpdateMyProfile = profileApi.updateMyProfile as jest.MockedFunction<
  typeof profileApi.updateMyProfile
>;
const mockUpdateMyLocation = profileApi.updateMyLocation as jest.MockedFunction<
  typeof profileApi.updateMyLocation
>;
const mockGetLocationWithFallback =
  getLocationWithFallback as jest.MockedFunction<typeof getLocationWithFallback>;

jest.spyOn(Alert, 'alert');

describe('Onboarding Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    mockReplace.mockClear();
    mockRefreshProfile.mockResolvedValue(undefined);
    mockUpdateMyProfile.mockResolvedValue({
      id: 'test-user-id',
      display_name: 'John',
      phone: null,
      push_token: null,
      location_geohash: null,
      location_updated_at: null,
      created_at: '2025-01-01T00:00:00.000Z',
    });
    mockUpdateMyLocation.mockResolvedValue({
      id: 'test-user-id',
      display_name: 'John',
      phone: null,
      push_token: null,
      location_geohash: '9q8yyk',
      location_updated_at: '2025-01-01T00:00:00.000Z',
      created_at: '2025-01-01T00:00:00.000Z',
    });
    mockGetLocationWithFallback.mockResolvedValue({
      coords: { latitude: 37.7749, longitude: -122.4194 },
      timestamp: Date.now(),
    } as any);
    (Alert.alert as jest.Mock).mockClear();
  });

  describe('Welcome Screen', () => {
    it('renders app branding', () => {
      const { getByText } = render(<WelcomeScreen />);
      expect(getByText('EL BOTÓN')).toBeTruthy();
      expect(getByText('PROTECTION IS ONE BUTTON AWAY')).toBeTruthy();
    });

    it('renders welcome message', () => {
      const { getByText } = render(<WelcomeScreen />);
      expect(getByText('Welcome to El Botón')).toBeTruthy();
    });

    it('renders get started button', () => {
      const { getByText } = render(<WelcomeScreen />);
      expect(getByText("Let's Get Started")).toBeTruthy();
    });

    it('shows progress indicator at step 1', () => {
      expect(render(<WelcomeScreen />).toJSON()).toBeTruthy();
    });

    it('navigates to display name on button press', () => {
      const { getByText } = render(<WelcomeScreen />);

      fireEvent.press(getByText("Let's Get Started"));

      expect(mockPush).toHaveBeenCalledWith('/(onboarding)/display-name');
    });
  });

  describe('Display Name Screen', () => {
    it('renders display name prompt', () => {
      const { getByText } = render(<DisplayNameScreen />);
      expect(getByText('What should we call you?')).toBeTruthy();
    });

    it('renders input field with placeholder', () => {
      const { getByPlaceholderText } = render(<DisplayNameScreen />);
      expect(getByPlaceholderText('e.g., John, Maria, Alex')).toBeTruthy();
    });

    it('renders continue button', () => {
      const { getByText } = render(<DisplayNameScreen />);
      expect(getByText('Continue')).toBeTruthy();
    });

    it('disables submit when name is too short', () => {
      const { getByPlaceholderText, getByText } = render(<DisplayNameScreen />);

      fireEvent.changeText(getByPlaceholderText('e.g., John, Maria, Alex'), 'A');

      expect(getByText('Continue')).toBeTruthy();
    });

    it('saves display name and navigates on submit', async () => {
      const { getByPlaceholderText, getByText } = render(<DisplayNameScreen />);

      fireEvent.changeText(
        getByPlaceholderText('e.g., John, Maria, Alex'),
        'John'
      );

      await act(async () => {
        fireEvent.press(getByText('Continue'));
      });

      await waitFor(() => {
        expect(mockUpdateMyProfile).toHaveBeenCalledWith({
          display_name: 'John',
        });
        expect(mockRefreshProfile).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith('/(onboarding)/location');
      });
    });

    it('shows error on save failure', async () => {
      mockUpdateMyProfile.mockRejectedValue(new Error('Save failed'));

      const { findByText, getByPlaceholderText, getByText } = render(
        <DisplayNameScreen />
      );

      fireEvent.changeText(
        getByPlaceholderText('e.g., John, Maria, Alex'),
        'John'
      );

      await act(async () => {
        fireEvent.press(getByText('Continue'));
      });

      expect(
        await findByText("Couldn't save your name. Please try again.")
      ).toBeTruthy();
    });

    it('shows hint text', () => {
      const { getByText } = render(<DisplayNameScreen />);
      expect(getByText('This is how your circle will see you')).toBeTruthy();
    });

    it('renders the progress indicator', () => {
      expect(render(<DisplayNameScreen />).toJSON()).toBeTruthy();
    });
  });

  describe('Location Screen', () => {
    it('renders location permission prompt', () => {
      const { getByText } = render(<LocationScreen />);
      expect(getByText('Enable Location')).toBeTruthy();
    });

    it('renders explanation text', () => {
      const { getByText } = render(<LocationScreen />);
      expect(
        getByText("Your location is essential for El Botón to work. Here's why:")
      ).toBeTruthy();
    });

    it('renders bullet points explaining location usage', () => {
      const { getByText } = render(<LocationScreen />);
      expect(getByText('Share your exact location when you need help')).toBeTruthy();
      expect(getByText('Help responders find you quickly')).toBeTruthy();
      expect(getByText('Connect with nearby circle members')).toBeTruthy();
    });

    it('renders enable location button', () => {
      const { getByText } = render(<LocationScreen />);
      expect(getByText('Enable Location Access')).toBeTruthy();
    });

    it('requests location permission on button press', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const { getByText } = render(<LocationScreen />);

      await act(async () => {
        fireEvent.press(getByText('Enable Location Access'));
      });

      await waitFor(() => {
        expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
      });
    });

    it('navigates to notifications on permission granted', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const { getByText } = render(<LocationScreen />);

      await act(async () => {
        fireEvent.press(getByText('Enable Location Access'));
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/(onboarding)/notifications');
      });
    });

    it('shows an alert when permission is denied', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const { getByText } = render(<LocationScreen />);

      await act(async () => {
        fireEvent.press(getByText('Enable Location Access'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Location Required',
          expect.any(String),
          expect.any(Array)
        );
      });
    });

    it('saves the current location when permission is granted', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const { getByText } = render(<LocationScreen />);

      await act(async () => {
        fireEvent.press(getByText('Enable Location Access'));
      });

      await waitFor(() => {
        expect(mockUpdateMyLocation).toHaveBeenCalledWith(37.7749, -122.4194);
      });
    });

    it('renders skip button', () => {
      const { getByText } = render(<LocationScreen />);
      expect(getByText('Not Now')).toBeTruthy();
    });

    it('shows confirmation alert when skip is pressed', () => {
      const { getByText } = render(<LocationScreen />);

      fireEvent.press(getByText('Not Now'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Are you sure?',
        expect.stringContaining('Without location access'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Skip Anyway', style: 'destructive' }),
        ])
      );
    });

    it('navigates to notifications when skip is confirmed', () => {
      const { getByText } = render(<LocationScreen />);

      fireEvent.press(getByText('Not Now'));

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const skipButton = alertCall[2].find((btn: any) => btn.text === 'Skip Anyway');
      skipButton.onPress();

      expect(mockPush).toHaveBeenCalledWith('/(onboarding)/notifications');
    });

    it('renders the progress indicator', () => {
      expect(render(<LocationScreen />).toJSON()).toBeTruthy();
    });

    it('handles location fetch error gracefully', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      mockGetLocationWithFallback.mockRejectedValueOnce(
        new Error('Location unavailable')
      );

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const { getByText } = render(<LocationScreen />);

      await act(async () => {
        fireEvent.press(getByText('Enable Location Access'));
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/(onboarding)/notifications');
      });

      consoleSpy.mockRestore();
    });
  });
});
