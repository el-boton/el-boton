// Mock expo-location
process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000';

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10,
      },
    })
  ),
  getLastKnownPositionAsync: jest.fn(() =>
    Promise.resolve(null)
  ),
  getForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  Accuracy: {
    High: 6,
  },
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[test]' })),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidNotificationPriority: { MAX: 'max' },
  AndroidImportance: { MAX: 5 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
}));

// Mock expo-device
jest.mock('expo-device', () => ({
  isDevice: true,
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSegments: () => ['(tabs)'],
  useLocalSearchParams: () => ({ id: 'test-alert-id' }),
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: {
    Screen: () => null,
  },
  Tabs: {
    Screen: () => null,
  },
}));

// Mock frontend API client modules
jest.mock('@/lib/api/auth', () => ({
  getSession: jest.fn(() =>
    Promise.resolve({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: 'test-user-id', phone: '+15551234567' },
    })
  ),
  getCurrentSession: jest.fn(() => ({
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: 'test-user-id', phone: '+15551234567' },
  })),
  getCurrentUser: jest.fn(() => ({
    id: 'test-user-id',
    phone: '+15551234567',
  })),
  onAuthStateChange: jest.fn(() => ({
    unsubscribe: jest.fn(),
  })),
  requestOtp: jest.fn(() => Promise.resolve()),
  verifyOtp: jest.fn(() =>
    Promise.resolve({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: 'test-user-id', phone: '+15551234567' },
    })
  ),
  signOut: jest.fn(() => Promise.resolve()),
  deleteAccount: jest.fn(() => Promise.resolve()),
  authenticatedRequest: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('@/lib/api/profile', () => ({
  getMyProfile: jest.fn(() =>
    Promise.resolve({
      id: 'test-user-id',
      display_name: 'Test User',
      phone: '+15551234567',
      push_token: 'test-push-token',
      location_geohash: '9q8yyk',
      location_updated_at: '2025-01-01T00:00:00.000Z',
      created_at: '2025-01-01T00:00:00.000Z',
    })
  ),
  updateMyProfile: jest.fn((patch) =>
    Promise.resolve({
      id: 'test-user-id',
      display_name: patch?.display_name ?? 'Test User',
      phone: '+15551234567',
      push_token: patch?.push_token ?? 'test-push-token',
      location_geohash: patch?.location_geohash ?? '9q8yyk',
      location_updated_at:
        patch?.location_updated_at ?? '2025-01-01T00:00:00.000Z',
      created_at: '2025-01-01T00:00:00.000Z',
    })
  ),
  updateMyLocation: jest.fn(() =>
    Promise.resolve({
      id: 'test-user-id',
      display_name: 'Test User',
      phone: '+15551234567',
      push_token: 'test-push-token',
      location_geohash: '9q8yyk',
      location_updated_at: '2025-01-01T00:00:00.000Z',
      created_at: '2025-01-01T00:00:00.000Z',
    })
  ),
}));

jest.mock('@/lib/api/circles', () => ({
  listCircles: jest.fn(() => Promise.resolve([])),
  createCircle: jest.fn((name) =>
    Promise.resolve({
      id: 'circle-1',
      name,
      created_by: 'test-user-id',
      invite_code: 'ABC123',
      created_at: '2025-01-01T00:00:00.000Z',
      role: 'owner',
      memberCount: 1,
    })
  ),
  joinCircle: jest.fn(() =>
    Promise.resolve({
      id: 'circle-1',
      name: 'Circle',
      created_by: 'owner-id',
      invite_code: 'ABC123',
      created_at: '2025-01-01T00:00:00.000Z',
      role: 'member',
      memberCount: 2,
    })
  ),
  listCircleMembers: jest.fn(() => Promise.resolve([])),
  leaveCircle: jest.fn(() => Promise.resolve()),
  removeCircleMember: jest.fn(() => Promise.resolve()),
  deleteCircle: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/api/alerts', () => ({
  createAlertRequest: jest.fn(() =>
    Promise.resolve({
      id: 'test-alert-id',
      sender_id: 'test-user-id',
      latitude: 37.7749,
      longitude: -122.4194,
      geohash: '9q8yyk',
      status: 'active',
      expand_to_nearby: false,
      created_at: '2025-01-01T00:00:00.000Z',
      resolved_at: null,
    })
  ),
  getAlert: jest.fn(() =>
    Promise.resolve({
      id: 'test-alert-id',
      sender_id: 'test-user-id',
      latitude: 37.7749,
      longitude: -122.4194,
      geohash: '9q8yyk',
      status: 'active',
      expand_to_nearby: false,
      created_at: '2025-01-01T00:00:00.000Z',
      resolved_at: null,
    })
  ),
  cancelAlert: jest.fn(() => Promise.resolve()),
  resolveAlert: jest.fn(() => Promise.resolve()),
  expandAlert: jest.fn(() => Promise.resolve()),
  respondToAlertRequest: jest.fn(() => Promise.resolve()),
  listAlertResponses: jest.fn(() => Promise.resolve([])),
  listAlertMessages: jest.fn(() => Promise.resolve([])),
  sendAlertMessage: jest.fn(() => Promise.resolve()),
  getAlertHistory: jest.fn(() => Promise.resolve([])),
}));

jest.mock('@/lib/api/realtime', () => ({
  subscribeToAlertChannel: jest.fn(() => ({
    unsubscribe: jest.fn(),
  })),
  subscribeToUserAlertsChannel: jest.fn(() => ({
    unsubscribe: jest.fn(),
  })),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Tamagui
jest.mock('tamagui', () => {
  const React = require('react');
  const { View, Text: RNText, TextInput, Pressable, ScrollView: RNScrollView } = require('react-native');

  const createMockComponent = (name) => {
    const Component = ({ children, onPress, ...props }) => {
      if (onPress) {
        return React.createElement(Pressable, { onPress, testID: props.testID }, children);
      }
      return React.createElement(View, { testID: props.testID }, children);
    };
    Component.displayName = name;
    return Component;
  };

  return {
    TamaguiProvider: ({ children }) => children,
    Theme: ({ children }) => children,
    YStack: createMockComponent('YStack'),
    XStack: createMockComponent('XStack'),
    Stack: createMockComponent('Stack'),
    Text: ({ children, ...props }) => React.createElement(RNText, props, children),
    Button: ({ children, onPress, ...props }) =>
      React.createElement(Pressable, { onPress, testID: props.testID }, children),
    Input: ({ onChangeText, ...props }) =>
      React.createElement(TextInput, { ...props, onChangeText }),
    ScrollView: ({ children, ...props }) =>
      React.createElement(RNScrollView, props, children),
    Separator: () => React.createElement(View),
    Spinner: () => React.createElement(View),
    Sheet: Object.assign(
      ({ children }) => children,
      {
        Overlay: () => null,
        Frame: ({ children }) => children,
        Handle: () => null,
      }
    ),
    styled: (Component, styles) => {
      const StyledComponent = (props) => React.createElement(Component, props);
      StyledComponent.displayName = `Styled(${Component.displayName || Component.name || 'Component'})`;
      return StyledComponent;
    },
    createTamagui: (config) => config,
    createTokens: (tokens) => tokens,
  };
});

// Mock @tamagui/lucide-icons
jest.mock('@tamagui/lucide-icons', () => {
  const React = require('react');
  const { View } = require('react-native');

  const createIcon = (name) => {
    const Icon = () => React.createElement(View, { testID: `icon-${name}` });
    Icon.displayName = name;
    return Icon;
  };

  return {
    AlertTriangle: createIcon('AlertTriangle'),
    ArrowLeft: createIcon('ArrowLeft'),
    Bell: createIcon('Bell'),
    Car: createIcon('Car'),
    Check: createIcon('Check'),
    CheckCircle: createIcon('CheckCircle'),
    ChevronDown: createIcon('ChevronDown'),
    ChevronUp: createIcon('ChevronUp'),
    ChevronRight: createIcon('ChevronRight'),
    Clock: createIcon('Clock'),
    Copy: createIcon('Copy'),
    Edit3: createIcon('Edit3'),
    Eye: createIcon('Eye'),
    Globe: createIcon('Globe'),
    Info: createIcon('Info'),
    LogOut: createIcon('LogOut'),
    MapPin: createIcon('MapPin'),
    MessageCircle: createIcon('MessageCircle'),
    MessageSquare: createIcon('MessageSquare'),
    Navigation: createIcon('Navigation'),
    Pencil: createIcon('Pencil'),
    Phone: createIcon('Phone'),
    Plus: createIcon('Plus'),
    Radio: createIcon('Radio'),
    Search: createIcon('Search'),
    Send: createIcon('Send'),
    Settings: createIcon('Settings'),
    Share2: createIcon('Share2'),
    Shield: createIcon('Shield'),
    Trash2: createIcon('Trash2'),
    User: createIcon('User'),
    UserPlus: createIcon('UserPlus'),
    Users: createIcon('Users'),
    X: createIcon('X'),
    XCircle: createIcon('XCircle'),
  };
});

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockMapView = ({ children, ...props }) => React.createElement(View, { testID: 'map-view', ...props }, children);
  MockMapView.Marker = ({ children, ...props }) => React.createElement(View, { testID: 'map-marker', ...props }, children);

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMapView.Marker,
    PROVIDER_GOOGLE: 'google',
  };
});

// Mock phoenix channels
jest.mock(
  'phoenix',
  () => ({
    Socket: jest.fn().mockImplementation(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
      channel: jest.fn(() => ({
        on: jest.fn(),
        join: jest.fn(() => ({
          receive: jest.fn(() => ({ receive: jest.fn() })),
        })),
        leave: jest.fn(),
      })),
    })),
  }),
  { virtual: true }
);

// Mock expo-linking
jest.mock('expo-linking', () => ({
  openSettings: jest.fn(),
  openURL: jest.fn(),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = {
        'common.appName': 'EL BOTÓN',
        'common.tagline': 'PROTECTION IS ONE BUTTON AWAY',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.ok': 'OK',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.create': 'Create',
        'common.join': 'Join',
        'common.enabled': 'Enabled',
        'common.enable': 'Enable',
        'common.notSet': 'Not set',
        'common.secureConnection': 'SECURE CONNECTION',
        'home.locationRequired': 'Location Required',
        'home.locationPermissionMessage': 'El Botón needs your location to alert your circle when you need help.',
        'home.cooldownActive': 'Cooldown Active',
        'home.cooldownMessage': 'Please wait {{minutes}} minutes before sending another alert.',
        'home.sendAnyway': 'Send Anyway',
        'home.locationError': 'Could not get your location. Please try again.',
        'history.title': 'History',
        'history.subtitle': 'Your sent and received alerts',
        'history.noAlerts': 'No alerts yet',
        'history.noAlertsHint': "When you send or receive alerts, they'll appear here",
        'history.active': 'ACTIVE ({{count}})',
        'history.past': 'PAST',
        'history.you': 'You',
        'history.unknown': 'Unknown',
        'history.from': 'From',
        'circles.title': 'Circles',
        'circles.subtitle': 'Manage your trusted circles',
        'circles.noCircles': 'No circles yet',
        'circles.createHint': 'Create or join a circle to get started',
        'circles.yourCircles': 'Your Circles ({{count}})',
        'circles.code': 'CODE: {{code}}',
        'circles.createCircle': 'Create Circle',
        'circles.createDescription': 'Create a new circle for your trusted contacts',
        'circles.namePlaceholder': 'e.g., Family, Neighbors, Friends',
        'circles.joinCircle': 'Join Circle',
        'circles.joinDescription': 'Enter the invite code to join',
        'circles.codePlaceholder': 'ABC123',
        'circles.invalidCode': 'Invalid invite code',
        'circles.alreadyMember': 'Already a Member',
        'circles.alreadyInCircle': "You're already in this circle",
        'circles.shareMessage': 'Join my circle "{{name}}" on El Botón! Use code: {{code}}',
        'settings.title': 'Settings',
        'settings.profile': 'PROFILE',
        'settings.displayName': 'Display Name',
        'settings.phone': 'Phone Number',
        'settings.permissions': 'PERMISSIONS',
        'settings.location': 'Location',
        'settings.locationHint': 'Required for emergency alerts',
        'settings.notifications': 'Notifications',
        'settings.notificationsHint': 'Receive alerts from your circle',
        'settings.language': 'LANGUAGE',
        'settings.languageHint': 'Choose your preferred language',
        'settings.about': 'ABOUT',
        'settings.version': 'v1.0.0',
        'settings.signOut': 'Sign Out',
        'settings.signOutConfirm': 'Are you sure you want to sign out?',
        'settings.permissionRequired': 'Permission Required',
        'settings.enableLocationMessage': 'Please enable location in your device settings.',
        'settings.enableNotificationsMessage': 'Please enable notifications in your device settings.',
        'auth.phoneNumber': 'Phone Number',
        'auth.phonePlaceholderUS': '(555) 123-4567',
        'auth.phonePlaceholderIntl': 'Enter phone number',
        'auth.sendCode': 'Send Verification Code',
        'auth.invalidPhone': 'Please enter a valid phone number',
        'auth.verificationCode': 'Verification Code',
        'auth.enterCode': 'Enter the 6-digit code sent to {{phone}}',
        'auth.codePlaceholder': '000000',
        'auth.verifyAndContinue': 'Verify & Continue',
        'auth.invalidCode': 'Please enter a valid 6-digit code',
        'auth.useDifferentNumber': 'Use a different number',
        'onboarding.welcomeTitle': 'Welcome to El Botón',
        'onboarding.welcomeDescription': 'Your personal safety network in the palm of your hand.',
        'onboarding.getStarted': "Let's Get Started",
        'onboarding.displayNameTitle': 'What should we call you?',
        'onboarding.displayNameDescription': 'This name will be visible to your circle when you send or respond to alerts.',
        'onboarding.displayNameLabel': 'YOUR NAME',
        'onboarding.displayNamePlaceholder': 'e.g., John, Maria, Alex',
        'onboarding.displayNameHint': 'This is how your circle will see you',
        'onboarding.continue': 'Continue',
        'onboarding.saveError': "Couldn't save your name. Please try again.",
        'onboarding.locationTitle': 'Enable Location',
        'onboarding.locationDescription': "Your location is essential for El Botón to work. Here's why:",
        'onboarding.locationBullet1': 'Share your exact location when you need help',
        'onboarding.locationBullet2': 'Help responders find you quickly',
        'onboarding.locationBullet3': 'Connect with nearby circle members',
        'onboarding.enableLocation': 'Enable Location Access',
        'onboarding.skipLocation': 'Not Now',
        'onboarding.skipLocationTitle': 'Are you sure?',
        'onboarding.skipLocationMessage': "Without location access, El Boton won't be able to share your location during emergencies or help responders find you. You can enable it later in Settings.",
        'onboarding.skipAnyway': 'Skip Anyway',
        'onboarding.locationRequired': 'Location Required',
        'onboarding.locationRequiredMessage': 'El Botón requires location access to function. Please enable it in settings.',
        'onboarding.openSettings': 'Open Settings',
        'onboarding.tryAgain': 'Try Again',
        'alert.cancelAlert': 'Cancel Alert',
        'alert.cancelConfirm': 'Are you sure you want to cancel this alert?',
        'alert.yes': 'Yes, Cancel',
        'alert.no': 'No, Keep Alert',
        'alert.expandTitle': 'Expand to Nearby',
        'alert.expandMessage': 'This will alert users in nearby areas who are not in your circles.',
        'alert.expand': 'Expand',
        'alert.yourAlert': 'YOUR ALERT',
        'alert.emergencyAlert': 'EMERGENCY ALERT',
        'alert.activeEmergency': 'ACTIVE EMERGENCY',
        'alert.helpRequested': 'Help Requested',
        'alert.resolved': 'RESOLVED',
        'alert.situationResolved': 'Situation Resolved',
        'alert.cancelled': 'CANCELLED',
        'alert.alertCancelled': 'Alert Cancelled',
        'alert.location': 'LOCATION',
        'alert.directions': 'Directions',
        'alert.expandedBanner': 'Expanded to nearby users',
        'alert.responders': 'RESPONDERS ({{count}})',
        'alert.waitingForResponders': 'Waiting for responders...',
        'alert.noResponders': 'No responders',
        'alert.circleNotified': 'Your circle has been notified',
        'alert.acknowledged': 'Acknowledged',
        'alert.onTheWay': 'On the way',
        'alert.arrived': 'Arrived',
        'alert.circleMember': 'Circle Member',
        'alert.messages': 'MESSAGES',
        'alert.noMessages': 'No messages yet',
        'alert.you': 'You',
        'alert.typeMessage': 'Type a message...',
        'alert.expandToNearby': 'Expand to Nearby Users',
        'alert.imSafe': "I'm Safe",
        'alert.iSeeThis': 'I See This Alert',
        'alert.onMyWay': 'On My Way',
        'alert.arrivedButton': 'Arrived',
        'alert.backToHome': 'Back to Home',
        'alert.loadingAlert': 'LOADING ALERT...',
        'bigRedButton.holdFor': 'HOLD FOR',
        'bigRedButton.help': 'HELP',
        'bigRedButton.activating': 'ACTIVATING',
        'bigRedButton.alertSent': 'ALERT SENT',
        'bigRedButton.holdSeconds': 'Hold for 3 seconds',
        'bigRedButton.holdToAlert': 'Hold for 3 seconds to alert your circle',
        'bigRedButton.circleNotified': 'Your circle will be notified',
        'bigRedButton.cooldownActive': 'COOLDOWN ACTIVE',
        'bigRedButton.cooldownWait': 'Please wait before sending another alert',
        'bigRedButton.keepHolding': 'Keep Holding',
        'bigRedButton.preparingAlert': 'Preparing alert...',
        'bigRedButton.almostThere': 'Almost There',
        'bigRedButton.stayWithMe': 'Stay with me...',
        'bigRedButton.sending': 'Sending',
        'bigRedButton.helpOnTheWay': 'Help is on the way!',
        'bigRedButton.releaseToCancel': 'Release to cancel',
      };
      // Handle interpolation
      let result = translations[key] || key;
      if (typeof result === 'string') {
        result = result.replace(/\{\{(\w+)\}\}/g, (match, p1) => `{{${p1}}}`);
      }
      return result;
    },
    i18n: {
      changeLanguage: jest.fn(),
      language: 'en',
    },
  }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

// Silence console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
