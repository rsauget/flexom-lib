import axios from 'axios';
import urlencode from 'form-urlencoded';
import _ from 'lodash';
import { User } from './model/user';
import { Zone, Factor, MASTER_ZONE_ID } from './model/zone';
import { Thing } from './model/thing';
import { HemisListener } from './model/event';
import { createWsClient, WsClient } from './ws';
import { FlexomLibError } from '../error';
import { Logger } from '../logger';

const ZONE_FACTOR_WAIT_TIMEOUT = 60000;
const ZONE_FACTOR_TOLERANCE = 0.05;

export type HemisService = {
  login: (_: {
    email: string;
    token: string;
    kernelId: string;
  }) => Promise<User>;
  getZones: () => Promise<Zone[]>;
  getZoneSettings: (_: { id: string }) => Promise<Zone['settings']>;
  setZoneFactor: (_: {
    id: string;
    factor: Factor;
    value: number;
    wait?: boolean;
    tolerance?: number;
  }) => Promise<void | { aborted: boolean }>;
  getThings: () => Promise<Thing[]>;
  subscribe: (listener: HemisListener) => Promise<void>;
  unsubscribe: (
    listener: Pick<HemisListener, 'id'> & Partial<HemisListener>
  ) => Promise<void>;
  logout: () => Promise<void>;
};

export function createHemisService({
  baseUrl,
  wsUrl,
  userId,
  buildingId,
  logger,
}: {
  baseUrl: string;
  wsUrl: string;
  userId: string;
  buildingId: string;
  logger: Logger;
}): HemisService {
  let token: string | undefined;

  const promises: Record<string, { abort: () => void }> = {};

  const client = axios.create({
    baseURL: baseUrl,
    headers: {
      'X-Logged-User': userId,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    transformRequest: [
      (data, headers) => {
        if (headers && token) {
          // eslint-disable-next-line no-param-reassign
          headers.Authorization = `Bearer ${token}`;
        }
        return urlencode(data);
      },
    ],
  });

  const getWsClient: () => Promise<WsClient> = (() => {
    let wsClient: WsClient;
    return async () => {
      if (wsClient) return wsClient;
      if (!token) throw new FlexomLibError('Not logged in');
      wsClient = await createWsClient({ wsUrl, buildingId, token, logger });
      return wsClient;
    };
  })();

  const login: HemisService['login'] = async ({
    email,
    token: password,
    kernelId,
  }) => {
    const { data: user } = await client.post<User>('/WS_UserManagement/login', {
      email,
      password,
      kernelId,
    });
    token = user.token;
    return user;
  };

  const logout: HemisService['logout'] = async () => {
    try {
      token = undefined;
      const wsClient = await getWsClient();
      wsClient?.disconnect();
      await Promise.all(_.map(promises, async ({ abort }) => abort()));
    } catch (err) {
      logger.error({ err }, 'Logout failed');
    }
  };

  const getZones: HemisService['getZones'] = async () => {
    const { data: zones } = await client.get<Zone[]>('/WS_ZoneManagement/list');
    return zones.map((zone: Zone) =>
      zone.id === MASTER_ZONE_ID ? { ...zone, name: 'Ma Maison' } : zone
    );
  };

  const getZoneSettings: HemisService['getZoneSettings'] = async ({ id }) => {
    const { data: settings } = await client.get<Zone['settings']>(
      `/WS_ReactiveEnvironmentDataManagement/${id}/settings`
    );
    return settings;
  };

  const getThings = async () => {
    const { data: things } = await client.get<Thing[]>(
      '/intelligent-things/listV2'
    );
    return things;
  };

  const setZoneFactor: HemisService['setZoneFactor'] = async ({
    id,
    factor,
    value,
    wait = true,
    tolerance = ZONE_FACTOR_TOLERANCE,
  }) => {
    const listenerId = `${buildingId}:${id}:${factor}`;

    promises[listenerId]?.abort();

    const wsClient = await getWsClient();

    const promise = new Promise<void | { aborted: boolean }>(
      (resolve, reject) => {
        if (!wait) resolve();

        const timeoutId = setTimeout(async () => {
          try {
            const settings = await getZoneSettings({ id });
            if (Math.abs(settings[factor].value - value) < tolerance) {
              resolve();
            } else {
              reject(
                new FlexomLibError('Timed out waiting for zone factor update')
              );
            }
            wsClient.removeListener({ id: listenerId });
          } catch (err) {
            reject(err);
          }
        }, ZONE_FACTOR_WAIT_TIMEOUT);

        promises[listenerId] = {
          abort: () => {
            try {
              clearTimeout(timeoutId);
              wsClient.removeListener({ id: listenerId });
              delete promises[listenerId];
            } catch (err) {
              logger.error({ err }, 'Abort failed');
            } finally {
              resolve({ aborted: true });
            }
          },
        };

        wsClient.addListener({
          id: listenerId,
          events: ['ACTUATOR_HARDWARE_STATE'],
          listener: (data) => {
            if (data.factorId !== factor) return;
            if (Math.abs(data.value.value - value) > tolerance) return;
            try {
              clearTimeout(timeoutId);
              wsClient.removeListener({ id: listenerId });
            } catch (err) {
              logger.warn({ err }, 'error cleaning up listener');
            } finally {
              resolve();
            }
          },
        });
      }
    );

    await client.put<void>(
      `/WS_ReactiveEnvironmentDataManagement/${id}/settings/${factor}/value`,
      { value }
    );

    return promise;
  };

  const subscribe: HemisService['subscribe'] = async (listener) => {
    const wsClient = await getWsClient();
    wsClient.addListener(listener);
  };

  const unsubscribe: HemisService['unsubscribe'] = async (listener) => {
    const wsClient = await getWsClient();
    wsClient.removeListener(listener);
  };

  return {
    login,
    getZones,
    getZoneSettings,
    setZoneFactor,
    getThings,
    subscribe,
    unsubscribe,
    logout,
  };
}
