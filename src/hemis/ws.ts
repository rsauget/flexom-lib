import _ from 'lodash';
import * as StompJs from '@stomp/stompjs';
import pino from 'pino';
import { HemisListener, EventType } from './model/event';
import { FlexomLibError } from '../error';

export type WsClient = {
  addListener: <T extends EventType[] | undefined>(
    listener: HemisListener<T>
  ) => void;
  removeListener: (
    listener: Pick<HemisListener, 'id'> & Partial<HemisListener>
  ) => void;
  disconnect: () => Promise<void>;
};

export async function createWsClient({
  wsUrl,
  buildingId,
  token,
  logger,
}: {
  wsUrl: string;
  buildingId: string;
  token: string;
  logger: pino.BaseLogger;
}): Promise<WsClient> {
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
        logger.debug({ data }, 'event received');
        await Promise.all(
          _.chain(listeners)
            .filter(
              ({ events }) => _.isEmpty(events) || _.includes(events, data.type)
            )
            .map(async ({ listener }) => listener(data))
            .value()
        );
      } catch (err) {
        logger.error({ err }, 'listener error');
      }
    });
  };

  client.onStompError = (frame) => {
    logger.error(
      { frame, message: frame?.headers?.message, body: frame?.body },
      'Broker reported error: '
    );
  };

  client.activate();

  const addListener: WsClient['addListener'] = (listener) => {
    const { id } = listener;
    if (listeners[id]) {
      if (_.isEqual(listeners[id], listener)) {
        return;
      }
      throw new FlexomLibError(`different listener registered for id ${id}`);
    }
    listeners[id] = listener;
  };

  const removeListener: WsClient['removeListener'] = ({
    id,
  }: {
    id: string;
  }) => {
    delete listeners[id];
  };

  const disconnect: WsClient['disconnect'] = async () => {
    await client.deactivate();
  };

  return { addListener, removeListener, disconnect };
}
