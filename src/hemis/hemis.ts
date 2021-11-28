import axios from 'axios';
import urlencode from 'form-urlencoded';
import { v4 as uuidv4 } from 'uuid';
import { User } from './model/user';
import { Zone, Factor, MASTER_ZONE_ID } from './model/zone';
import { Thing } from './model/thing';
import { HemisListener } from './model/event';
import { createWsClient, WsClient } from './ws';
import { FlexomLibError } from '../error';

const ZONE_FACTOR_WAIT_TIMEOUT = 60000;

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
  }) => Promise<void>;
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
}: {
  baseUrl: string;
  wsUrl: string;
  userId: string;
  buildingId: string;
}): HemisService {
  let token: string | undefined;

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
      wsClient = await createWsClient({ wsUrl, buildingId, token });
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
    token = undefined;
    const wsClient = await getWsClient();
    if (!wsClient) return;
    wsClient.disconnect();
  };

  const getZones: HemisService['getZones'] = async () => {
    const { data: zones } = await client.get<Zone[]>('/WS_ZoneManagement/list');
    return zones.map((zone: Zone) =>
      zone.zoneId === MASTER_ZONE_ID ? { ...zone, name: 'Ma Maison' } : zone
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
    id: zoneId,
    factor,
    value,
    wait = true,
  }) => {
    const wsClient = await getWsClient();
    const id = uuidv4();
    const promise = new Promise<void>((resolve, reject) => {
      if (!wait) resolve();

      const timeoutId = setTimeout(() => {
        wsClient.removeListener({ id });
        reject(new FlexomLibError('Timed out waiting for zone factor update'));
      }, ZONE_FACTOR_WAIT_TIMEOUT);

      wsClient.addListener({
        id,
        events: ['ACTUATOR_HARDWARE_STATE'],
        listener: (data) => {
          if (data.factorId !== factor) return;
          if (data.value.value !== value) return;
          clearTimeout(timeoutId);
          resolve();
        },
      });
    });

    await client.put<void>(
      `/WS_ReactiveEnvironmentDataManagement/${zoneId}/settings/${factor}/value`,
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
