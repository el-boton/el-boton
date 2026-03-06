import {
  Alert,
  AlertMessage,
} from '@/lib/types';
import {
  AlertResponseWithResponder,
  createAlertRequest,
  expandAlert,
  getAlert,
  listAlertMessages,
  listAlertResponses,
  MessageWithSender,
  sendAlertMessage,
} from '@/lib/api/alerts';
import {
  cancelAlert as cancelAlertRequest,
  resolveAlert as resolveAlertRequest,
  respondToAlertRequest,
} from '@/lib/api/alerts';
import { subscribeToAlertChannel } from '@/lib/api/realtime';
import { ApiError } from '@/lib/api/http';

const COOLDOWN_MS = 5 * 60 * 1000;
let lastAlertTime: number | null = null;

export type { MessageWithSender };

export type CreateAlertResult =
  | { success: true; alert: Alert }
  | { success: false; error: string; cooldownRemaining?: number };

function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Request failed';
}

export async function createAlert(
  latitude: number,
  longitude: number,
  overrideCooldown = false
): Promise<CreateAlertResult> {
  if (!overrideCooldown && lastAlertTime) {
    const elapsed = Date.now() - lastAlertTime;
    if (elapsed < COOLDOWN_MS) {
      return {
        success: false,
        error: 'cooldown',
        cooldownRemaining: COOLDOWN_MS - elapsed,
      };
    }
  }

  try {
    const alert = await createAlertRequest(latitude, longitude);
    lastAlertTime = Date.now();
    return { success: true, alert };
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }
}

export async function cancelAlert(alertId: string): Promise<boolean> {
  try {
    await cancelAlertRequest(alertId);
    return true;
  } catch {
    return false;
  }
}

export async function resolveAlert(alertId: string): Promise<boolean> {
  try {
    await resolveAlertRequest(alertId);
    return true;
  } catch {
    return false;
  }
}

export async function expandToNearby(alertId: string): Promise<boolean> {
  try {
    await expandAlert(alertId);
    return true;
  } catch {
    return false;
  }
}

export async function respondToAlert(
  alertId: string,
  status: 'acknowledged' | 'en_route' | 'arrived'
): Promise<boolean> {
  try {
    await respondToAlertRequest(alertId, status);
    return true;
  } catch {
    return false;
  }
}

export function subscribeToAlert(
  alertId: string,
  onUpdate: (alert: Alert) => void
) {
  return subscribeToAlertChannel(alertId, [
    {
      event: 'alert.updated',
      handler: (payload) => onUpdate(payload.alert ?? payload),
    },
  ]);
}

export function subscribeToResponses(
  alertId: string,
  onResponse: (responses: AlertResponseWithResponder[]) => void
) {
  void listAlertResponses(alertId).then(onResponse).catch(() => undefined);

  return subscribeToAlertChannel(alertId, [
    {
      event: 'responses.updated',
      handler: (payload) => {
        if (Array.isArray(payload.responses)) {
          onResponse(payload.responses);
          return;
        }

        void listAlertResponses(alertId).then(onResponse).catch(() => undefined);
      },
    },
  ]);
}

export async function sendMessage(
  alertId: string,
  message: string
): Promise<boolean> {
  try {
    await sendAlertMessage(alertId, message.trim());
    return true;
  } catch {
    return false;
  }
}

export async function getMessages(alertId: string): Promise<MessageWithSender[]> {
  try {
    return await listAlertMessages(alertId);
  } catch {
    return [];
  }
}

export async function getAlertById(alertId: string): Promise<Alert | null> {
  try {
    return await getAlert(alertId);
  } catch {
    return null;
  }
}

export async function getResponses(
  alertId: string
): Promise<AlertResponseWithResponder[]> {
  try {
    return await listAlertResponses(alertId);
  } catch {
    return [];
  }
}

export function subscribeToMessages(
  alertId: string,
  onMessage: (messages: MessageWithSender[]) => void
) {
  void getMessages(alertId).then(onMessage);

  return subscribeToAlertChannel(alertId, [
    {
      event: 'message.inserted',
      handler: () => {
        void getMessages(alertId).then(onMessage).catch(() => undefined);
      },
    },
  ]);
}

export type { AlertMessage };
