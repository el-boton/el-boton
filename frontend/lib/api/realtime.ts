import { Channel, Socket } from 'phoenix';

import { getSession } from './auth';
import { getApiUrl } from './http';

type Subscription = {
  unsubscribe: () => void;
};

type Binding = { event: string; handler: (payload: any) => void };

let socket: Socket | null = null;
let socketAccessToken: string | null = null;

// Single channel per topic, ref-counted across subscribers
const topicChannels = new Map<
  string,
  { channel: Channel; refCount: number; bindingRefs: Map<number, number> }
>();
let nextBindingId = 0;

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

function subscribeTopic(topic: string, bindings: Binding[]): Subscription {
  let active = true;
  const myBindingIds: number[] = [];

  void (async () => {
    const connectedSocket = await ensureSocket();
    if (!active || !connectedSocket) {
      return;
    }

    let entry = topicChannels.get(topic);

    if (!entry) {
      // First subscriber — create and join the channel
      const channel = connectedSocket.channel(topic, {});
      entry = { channel, refCount: 0, bindingRefs: new Map() };
      topicChannels.set(topic, entry);

      channel
        .join()
        .receive('error', (error) => {
          console.warn(`Failed to join channel ${topic}:`, error);
        });
    }

    entry.refCount++;

    // Register event handlers on the shared channel
    bindings.forEach(({ event, handler }) => {
      const bindingId = nextBindingId++;
      const ref = entry!.channel.on(event, handler);
      entry!.bindingRefs.set(bindingId, ref);
      myBindingIds.push(bindingId);
    });
  })();

  return {
    unsubscribe() {
      active = false;
      const entry = topicChannels.get(topic);
      if (!entry) return;

      // Remove this subscriber's event handlers
      myBindingIds.forEach((bindingId) => {
        const ref = entry.bindingRefs.get(bindingId);
        if (ref !== undefined) {
          entry.channel.off(entry.channel.topic, ref);
          entry.bindingRefs.delete(bindingId);
        }
      });

      entry.refCount--;
      if (entry.refCount <= 0) {
        entry.channel.leave();
        topicChannels.delete(topic);
      }
    },
  };
}

export function subscribeToAlertChannel(
  alertId: string,
  bindings: Binding[]
): Subscription {
  return subscribeTopic(`alert:${alertId}`, bindings);
}

export function subscribeToUserAlertsChannel(
  userId: string,
  onUpdate: () => void
): Subscription {
  return subscribeTopic(`user:${userId}:alerts`, [
    {
      event: 'alerts.updated',
      handler: onUpdate,
    },
  ]);
}
