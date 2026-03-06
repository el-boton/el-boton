import AsyncStorage from '@react-native-async-storage/async-storage';

import { syncCredentialsToNative } from '@/lib/nativeCredentials';
import { AuthChangeEvent, AuthSession } from '@/lib/types';

import { ApiError, requestJson } from './http';

const SESSION_STORAGE_KEY = 'boton.auth.session.v1';
const REFRESH_LEEWAY_SECONDS = 60;

type SessionPayload = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    phone: string | null;
  };
};

type AuthListener = (event: AuthChangeEvent, session: AuthSession | null) => void;

let currentSession: AuthSession | null = null;
let sessionInitialized = false;
let refreshPromise: Promise<AuthSession | null> | null = null;
const listeners = new Set<AuthListener>();

function nowInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function normalizeSession(payload: SessionPayload): AuthSession {
  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: nowInSeconds() + payload.expires_in,
    user: payload.user,
  };
}

function notifyListeners(event: AuthChangeEvent, session: AuthSession | null): void {
  listeners.forEach((listener) => listener(event, session));
}

async function persistSession(session: AuthSession | null): Promise<void> {
  if (session) {
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } else {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
  }

  await syncCredentialsToNative(session);
}

async function replaceSession(
  session: AuthSession | null,
  event: AuthChangeEvent
): Promise<AuthSession | null> {
  currentSession = session;
  sessionInitialized = true;
  await persistSession(session);
  notifyListeners(event, session);
  return session;
}

async function loadStoredSession(): Promise<AuthSession | null> {
  if (sessionInitialized) {
    return currentSession;
  }

  const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
  currentSession = raw ? (JSON.parse(raw) as AuthSession) : null;
  sessionInitialized = true;
  await syncCredentialsToNative(currentSession);
  return currentSession;
}

async function refreshStoredSession(): Promise<AuthSession | null> {
  const session = await loadStoredSession();
  if (!session) {
    return null;
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const payload = await requestJson<SessionPayload>('/auth/refresh', {
        method: 'POST',
        body: {
          refresh_token: session.refresh_token,
        },
      });

      return replaceSession(normalizeSession(payload), 'TOKEN_REFRESHED');
    } catch (error) {
      await replaceSession(null, 'SIGNED_OUT');
      if (error instanceof ApiError) {
        return null;
      }
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function getSession(): Promise<AuthSession | null> {
  const session = await loadStoredSession();
  if (!session) {
    return null;
  }

  if (session.expires_at > nowInSeconds() + REFRESH_LEEWAY_SECONDS) {
    return session;
  }

  return refreshStoredSession();
}

export function getCurrentSession(): AuthSession | null {
  return currentSession;
}

export function getCurrentUser() {
  return currentSession?.user ?? null;
}

export function onAuthStateChange(listener: AuthListener) {
  listeners.add(listener);
  return {
    unsubscribe() {
      listeners.delete(listener);
    },
  };
}

export async function requestOtp(phone: string): Promise<void> {
  await requestJson('/auth/otp/request', {
    method: 'POST',
    body: { phone },
  });
}

export async function verifyOtp(
  phone: string,
  code: string
): Promise<AuthSession> {
  const payload = await requestJson<SessionPayload>('/auth/otp/verify', {
    method: 'POST',
    body: { phone, code },
  });

  const session = normalizeSession(payload);
  await replaceSession(session, 'SIGNED_IN');
  return session;
}

export async function signOut(): Promise<void> {
  const session = await loadStoredSession();

  try {
    if (session) {
      await requestJson('/auth/logout', {
        method: 'POST',
        body: {
          refresh_token: session.refresh_token,
        },
      });
    }
  } finally {
    await replaceSession(null, 'SIGNED_OUT');
  }
}

export async function deleteAccount(): Promise<void> {
  await authenticatedRequest('/me', {
    method: 'DELETE',
  });
  await replaceSession(null, 'SIGNED_OUT');
}

export async function authenticatedRequest<T>(
  path: string,
  init: Omit<RequestInit, 'body'> & {
    body?: Record<string, unknown> | unknown[] | null;
  } = {}
): Promise<T> {
  let session = await getSession();
  if (!session) {
    throw new ApiError('Not authenticated', 401, 'unauthenticated');
  }

  const doRequest = (accessToken: string) =>
    requestJson<T>(path, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      },
    });

  try {
    return await doRequest(session.access_token);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }

    session = await refreshStoredSession();
    if (!session) {
      throw error;
    }

    return doRequest(session.access_token);
  }
}
