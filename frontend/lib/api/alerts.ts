import { Alert, AlertMessage, AlertResponse, Profile } from '@/lib/types';

import { authenticatedRequest } from './auth';

export type MessageWithSender = AlertMessage & {
  sender: { display_name: string | null } | null;
};

export type AlertResponseWithResponder = AlertResponse & {
  responder: { display_name: string | null };
};

export type AlertWithSender = Alert & {
  sender: Pick<Profile, 'display_name'> | null;
};

export async function createAlertRequest(
  latitude: number,
  longitude: number
): Promise<Alert> {
  return authenticatedRequest<Alert>('/alerts', {
    method: 'POST',
    body: { latitude, longitude },
  });
}

export async function getAlert(alertId: string): Promise<Alert> {
  return authenticatedRequest<Alert>(`/alerts/${alertId}`);
}

export async function cancelAlert(alertId: string): Promise<void> {
  await authenticatedRequest<void>(`/alerts/${alertId}/cancel`, {
    method: 'POST',
  });
}

export async function resolveAlert(alertId: string): Promise<void> {
  await authenticatedRequest<void>(`/alerts/${alertId}/resolve`, {
    method: 'POST',
  });
}

export async function expandAlert(alertId: string): Promise<void> {
  await authenticatedRequest<void>(`/alerts/${alertId}/expand`, {
    method: 'POST',
  });
}

export async function respondToAlertRequest(
  alertId: string,
  status: 'acknowledged' | 'en_route' | 'arrived'
): Promise<void> {
  await authenticatedRequest<void>(`/alerts/${alertId}/response`, {
    method: 'PUT',
    body: { status },
  });
}

export async function listAlertResponses(
  alertId: string
): Promise<AlertResponseWithResponder[]> {
  return authenticatedRequest<AlertResponseWithResponder[]>(
    `/alerts/${alertId}/responses`
  );
}

export async function listAlertMessages(
  alertId: string
): Promise<MessageWithSender[]> {
  return authenticatedRequest<MessageWithSender[]>(`/alerts/${alertId}/messages`);
}

export async function sendAlertMessage(
  alertId: string,
  message: string
): Promise<void> {
  await authenticatedRequest<void>(`/alerts/${alertId}/messages`, {
    method: 'POST',
    body: { message },
  });
}

export async function getAlertHistory(): Promise<AlertWithSender[]> {
  return authenticatedRequest<AlertWithSender[]>('/alerts/history');
}
