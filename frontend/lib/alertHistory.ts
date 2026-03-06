import { ApiError } from '@/lib/api/http';
import {
  AlertWithSender,
  getAlertHistory,
} from '@/lib/api/alerts';
import { subscribeToUserAlertsChannel } from '@/lib/api/realtime';

export type { AlertWithSender };

export async function getInvolvedAlerts(_userId: string): Promise<AlertWithSender[]> {
  try {
    return await getAlertHistory();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return [];
    }

    throw error;
  }
}

export function subscribeToInvolvedAlerts(
  userId: string,
  onUpdate: () => void
) {
  return subscribeToUserAlertsChannel(userId, onUpdate);
}
