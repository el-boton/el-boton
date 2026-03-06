import { Channel, Socket } from 'phoenix';

import { getSession } from './auth';
import { getApiUrl } from './http';

type Subscription = {
  unsubscribe: () => void;
};

let socket: Socket | null = null;
let socketAccessToken: string | null = null;

function getSocketUrl(): string {
  return `${getApiUrl().replace(/^http/, 'ws')}/socket`;
}

async function ensureSocket(): Promise<Socket | null> {
  const session = await getSession();
  if (!session) {
    if (socket) {
      socket.disconnect();
      socket = null;
      socketAccessToken = null;
    }

    return null;
  }

  if (socket && socketAccessToken === session.access_token) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  socket = new Socket(getSocketUrl(), {
    params: { token: session.access_token },
  });
  socket.connect();
  socketAccessToken = session.access_token;

  return socket;
}

function joinTopic(
  topic: string,
  bindings: Array<{ event: string; handler: (payload: any) => void }>
): Subscription {
  let active = true;
  let channel: Channel | null = null;

  void (async () => {
    const connectedSocket = await ensureSocket();
    if (!active || !connectedSocket) {
      return;
    }

    channel = connectedSocket.channel(topic, {});
    bindings.forEach(({ event, handler }) => {
      channel?.on(event, handler);
    });

    channel
      .join()
      .receive('error', (error) => {
        console.warn(`Failed to join channel ${topic}:`, error);
      });
  })();

  return {
    unsubscribe() {
      active = false;
      channel?.leave();
    },
  };
}

export function subscribeToAlertChannel(
  alertId: string,
  bindings: Array<{ event: string; handler: (payload: any) => void }>
): Subscription {
  return joinTopic(`alert:${alertId}`, bindings);
}

export function subscribeToUserAlertsChannel(
  userId: string,
  onUpdate: () => void
): Subscription {
  return joinTopic(`user:${userId}:alerts`, [
    {
      event: 'alerts.updated',
      handler: onUpdate,
    },
  ]);
}
