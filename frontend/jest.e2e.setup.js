process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000';

global.WebSocket = require('ws');

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@/lib/nativeCredentials', () => ({
  syncCredentialsToNative: jest.fn(() => Promise.resolve()),
}));
