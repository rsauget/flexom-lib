import _ from 'lodash';
import * as StompJs from '@stomp/stompjs';
import { HemisListener } from './model/event';

export async function createWsClient({
  wsUrl,
  buildingId,
  token,
}: {
  wsUrl: string;
  buildingId: string;
  token: string;
}): Promise<{
  addListener: (args: { id: string; listener: HemisListener }) => void;
  removeListener: (args: { id: string }) => void;
  disconnect: () => Promise<void>;
}> {
  const client = new StompJs.Client({
    brokerURL: wsUrl,
    connectHeaders: {
      login: buildingId,
      passcode: token,
    },
    reconnectDelay: 100,
    heartbeatIncoming: 5000,
    heartbeatOutgoing: 5000,
  });

  const listeners: Record<string, HemisListener> = {};

  client.onConnect = () => {
    client.subscribe(`jms.topic.${buildingId}.data`, async (message) => {
      try {
        const data = JSON.parse(message.body);
        await Promise.all(_.map(listeners, (listener) => listener(data)));
      } catch (err) {
        console.log('Message error: ', err);
      }
    });
  };

  client.onStompError = (frame) => {
    console.log('Broker reported error: ', frame.headers.message);
    console.log('Additional details: ', frame.body);
  };

  client.activate();

  const addListener = ({
    id,
    listener,
  }: {
    id: string;
    listener: HemisListener;
  }) => {
    if (listeners[id]) {
      if (listeners[id] === listener) {
        return;
      }
      throw new Error(`different listener registered for id ${id}`);
    }
    listeners[id] = listener;
  };

  const removeListener = ({ id }: { id: string }) => {
    delete listeners[id];
  };

  const disconnect = async () => {
    await client.deactivate();
  };

  return { addListener, removeListener, disconnect };
}
