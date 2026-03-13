import { execSync } from 'node:child_process';

import {
  getSession,
  requestOtp,
  signOut,
  verifyOtp,
} from '@/lib/api/auth';
import {
  subscribeToAlertChannel,
  subscribeToUserAlertsChannel,
} from '@/lib/api/realtime';

type Session = Awaited<ReturnType<typeof verifyOtp>>;
type AlertPayload = { id: string };
type CirclePayload = { invite_code: string };

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
const BACKEND_CONTAINER = 'boton-backend-1';

jest.setTimeout(90_000);

let phoneCounter = 0;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makePhone(): string {
  phoneCounter += 1;
  const suffix = `${Date.now().toString().slice(-7)}${String(phoneCounter).padStart(2, '0')}`;
  return `+1555${suffix}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function waitFor<T>(
  predicate: () => T | Promise<T>,
  timeoutMs = 15_000,
  intervalMs = 150
): Promise<T> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const result = await predicate();
    if (result) {
      return result;
    }

    await delay(intervalMs);
  }

  throw new Error(`Timed out after ${timeoutMs}ms`);
}

function readLatestOtp(phone: string): string | null {
  const logs = execSync(`docker logs --tail 400 ${BACKEND_CONTAINER} 2>&1`, {
    encoding: 'utf8',
  });
  const pattern = new RegExp(
    `DEV OTP for ${escapeRegExp(phone)} via \\w+: (\\d{6})`,
    'g'
  );
  const matches = [...logs.matchAll(pattern)];
  return matches.at(-1)?.[1] ?? null;
}

async function signInWithOtp(phone: string): Promise<Session> {
  await requestOtp(phone);
  const code = await waitFor(() => readLatestOtp(phone), 20_000, 250);
  return verifyOtp(phone, code);
}

async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    accessToken?: string;
    body?: Record<string, unknown> | unknown[] | null;
  } = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(options.accessToken
        ? { Authorization: `Bearer ${options.accessToken}` }
        : {}),
    },
    body:
      options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  const parsed = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status} ${response.statusText} ${text}`
    );
  }

  return parsed as T;
}

async function createAlertScenario() {
  const sender = await signInWithOtp(makePhone());
  const responder = await signInWithOtp(makePhone());

  const circle = await apiRequest<CirclePayload>('/circles', {
    method: 'POST',
    accessToken: sender.access_token,
    body: { name: `Realtime E2E ${Date.now()}` },
  });

  await apiRequest('/circles/join', {
    method: 'POST',
    accessToken: responder.access_token,
    body: { invite_code: circle.invite_code },
  });

  const alert = await apiRequest<AlertPayload>('/alerts', {
    method: 'POST',
    accessToken: sender.access_token,
    body: { latitude: 37.7749, longitude: -122.4194 },
  });

  return { sender, responder, alert };
}

async function disconnectRealtimeSocket(): Promise<void> {
  await signOut().catch(() => undefined);
  const cleanupSubscription = subscribeToUserAlertsChannel('cleanup', () => {});
  await delay(250);
  cleanupSubscription.unsubscribe();
}

afterEach(async () => {
  await disconnectRealtimeSocket();
});

describe('realtime end to end', () => {
  it('removes unsubscribed handlers from shared alert topics', async () => {
    const { responder, alert } = await createAlertScenario();

    const unsubscribedHandler = jest.fn();
    const activeHandler = jest.fn();

    const firstSubscription = subscribeToAlertChannel(alert.id, [
      {
        event: 'responses.updated',
        handler: unsubscribedHandler,
      },
    ]);

    const secondSubscription = subscribeToAlertChannel(alert.id, [
      {
        event: 'responses.updated',
        handler: activeHandler,
      },
    ]);

    await delay(500);
    firstSubscription.unsubscribe();

    await apiRequest(`/alerts/${alert.id}/response`, {
      method: 'PUT',
      accessToken: responder.access_token,
      body: { status: 'acknowledged' },
    });

    await waitFor(() => activeHandler.mock.calls.length === 1);

    expect(unsubscribedHandler).not.toHaveBeenCalled();

    secondSubscription.unsubscribe();
  });

  it('re-subscribes cached user topics after auth refresh replaces the socket', async () => {
    const { sender, responder, alert } = await createAlertScenario();
    const originalAccessToken = responder.access_token;

    const originalSubscription = subscribeToUserAlertsChannel(
      responder.user.id,
      () => undefined
    );

    await delay(1_200);
    responder.expires_at = 0;

    const refreshedHandler = jest.fn();
    const refreshedSubscription = subscribeToUserAlertsChannel(
      responder.user.id,
      refreshedHandler
    );

    const refreshedSession = await waitFor(async () => {
      const session = await getSession();
      if (session && session.access_token !== originalAccessToken) {
        return session;
      }

      return null;
    });

    expect(refreshedSession.access_token).not.toBe(originalAccessToken);

    await delay(500);

    await apiRequest(`/alerts/${alert.id}/resolve`, {
      method: 'POST',
      accessToken: sender.access_token,
    });

    await waitFor(() => refreshedHandler.mock.calls.length === 1);

    originalSubscription.unsubscribe();
    refreshedSubscription.unsubscribe();
  });
});
