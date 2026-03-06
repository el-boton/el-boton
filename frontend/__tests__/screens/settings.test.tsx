import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';

import SettingsScreen from '@/app/(tabs)/settings';
import * as profileApi from '@/lib/api/profile';
import * as i18n from '@/lib/i18n';

const mockAuthSignOut = jest.fn().mockResolvedValue(undefined);

jest.mock('@/contexts/AuthContext', () => ({
  ...jest.requireActual('@/contexts/AuthContext'),
  useAuth: () => ({
    user: { id: 'test-user-id', phone: '+15551234567' },
    loading: false,
    signOut: mockAuthSignOut,
  }),
}));

jest.mock('@/lib/i18n', () => ({
  changeLanguage: jest.fn().mockResolvedValue(undefined),
  getCurrentLanguage: jest.fn().mockReturnValue('en'),
  supportedLanguages: [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Espanol' },
  ],
}));

const mockGetMyProfile = profileApi.getMyProfile as jest.MockedFunction<
  typeof profileApi.getMyProfile
>;
const mockChangeLanguage = i18n.changeLanguage as jest.MockedFunction<
  typeof i18n.changeLanguage
>;
const mockGetCurrentLanguage = i18n.getCurrentLanguage as jest.MockedFunction<
  typeof i18n.getCurrentLanguage
>;

jest.spyOn(Alert, 'alert');

describe('Settings Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthSignOut.mockResolvedValue(undefined);
    mockGetCurrentLanguage.mockReturnValue('en');
    mockGetMyProfile.mockResolvedValue({
      id: 'test-user-id',
      display_name: 'Test User',
      phone: '+15551234567',
      push_token: null,
      location_geohash: '9q8yyk',
      location_updated_at: '2025-01-01T00:00:00.000Z',
      created_at: '2025-01-01T00:00:00.000Z',
    });
    (Alert.alert as jest.Mock).mockClear();
  });

  describe('rendering', () => {
    it('renders settings title', async () => {
      const { findByText } = render(<SettingsScreen />);
      expect(await findByText('Settings')).toBeTruthy();
    });

    it('renders profile section', async () => {
      const { findByText } = render(<SettingsScreen />);
      expect(await findByText('PROFILE')).toBeTruthy();
      expect(await findByText('Display Name')).toBeTruthy();
      expect(await findByText('Phone Number')).toBeTruthy();
    });

    it('renders permissions section', async () => {
      const { findByText } = render(<SettingsScreen />);
      expect(await findByText('PERMISSIONS')).toBeTruthy();
      expect(await findByText('Location')).toBeTruthy();
      expect(await findByText('Notifications')).toBeTruthy();
    });

    it('renders language section', async () => {
      const { findAllByText } = render(<SettingsScreen />);
      expect((await findAllByText('LANGUAGE')).length).toBeGreaterThan(0);
    });

    it('renders about section', async () => {
      const { findByText } = render(<SettingsScreen />);
      expect(await findByText('ABOUT')).toBeTruthy();
      expect(await findByText('EL BOTÓN')).toBeTruthy();
    });

    it('renders sign out button', async () => {
      const { findByText } = render(<SettingsScreen />);
      expect(await findByText('Sign Out')).toBeTruthy();
    });
  });

  describe('profile editing', () => {
    it('shows current display name', async () => {
      const { findByText } = render(<SettingsScreen />);
      expect(await findByText('Test User')).toBeTruthy();
    });

    it('shows the edit icon for display name', async () => {
      const { findByTestId } = render(<SettingsScreen />);
      expect(await findByTestId('icon-Pencil')).toBeTruthy();
    });
  });

  describe('permissions', () => {
    it('shows location as enabled when granted', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const { findAllByText } = render(<SettingsScreen />);

      await waitFor(async () => {
        expect((await findAllByText('Enabled')).length).toBeGreaterThan(0);
      });
    });

    it('shows enable button when location is not granted', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const { findAllByText } = render(<SettingsScreen />);

      await waitFor(async () => {
        expect((await findAllByText('Enable')).length).toBeGreaterThan(0);
      });
    });

    it('requests location permission when enable is pressed', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const { findAllByText } = render(<SettingsScreen />);

      fireEvent.press((await findAllByText('Enable'))[0]);

      await waitFor(() => {
        expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
      });
    });
  });

  describe('language selection', () => {
    it('shows language options', async () => {
      const { findByText } = render(<SettingsScreen />);
      expect(await findByText('English')).toBeTruthy();
      expect(await findByText('Espanol')).toBeTruthy();
    });

    it('highlights the current language', async () => {
      mockGetCurrentLanguage.mockReturnValue('en');

      const { findByText } = render(<SettingsScreen />);

      expect(await findByText('English')).toBeTruthy();
    });

    it('changes language when pressed', async () => {
      const { findByText } = render(<SettingsScreen />);

      fireEvent.press(await findByText('Espanol'));

      await waitFor(() => {
        expect(mockChangeLanguage).toHaveBeenCalledWith('es');
      });
    });
  });

  describe('sign out', () => {
    it('shows confirmation dialog when sign out is pressed', async () => {
      const { findByText } = render(<SettingsScreen />);

      fireEvent.press(await findByText('Sign Out'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Sign Out',
        'Are you sure you want to sign out?',
        expect.any(Array)
      );
    });

    it('calls signOut when the confirmation action runs', async () => {
      const { findByText } = render(<SettingsScreen />);

      fireEvent.press(await findByText('Sign Out'));

      const [, , buttons] = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmButton = buttons.find((button: { text: string }) => button.text === 'Sign Out');

      await confirmButton.onPress();

      expect(mockAuthSignOut).toHaveBeenCalled();
    });
  });

  describe('notifications', () => {
    it('displays the notifications settings row', async () => {
      const { findByText } = render(<SettingsScreen />);
      expect(await findByText('Notifications')).toBeTruthy();
      expect(await findByText('Receive alerts from your circle')).toBeTruthy();
    });
  });
});
