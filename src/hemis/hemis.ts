import _ from 'lodash';
import axios from 'axios';
import urlencode from 'form-urlencoded';
import { User } from './model/user';
import { Zone, Factor, MASTER_ZONE_ID } from './model/zone';
import { Thing } from './model/thing';
import { HemisListener } from './model/event';
import { createWsClient } from './ws';

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
  }) => Promise<void>;
  getThings: () => Promise<Thing[]>;
  subscribe: (_: { id: string; listener: HemisListener }) => Promise<void>;
  unsubscribe: (_: { id: string }) => Promise<void>;
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

  let wsClient: {
    addListener: (_: { id: string; listener: HemisListener }) => void;
    removeListener: (_: { id: string }) => void;
    disconnect: () => void;
  };

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
    wsClient?.disconnect();
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

  const unwindZone = async ({ id }: Pick<Zone, 'id'>) => {
    if (id !== MASTER_ZONE_ID) {
      return [id];
    }

    const zones = await getZones();
    return _.chain(zones).reject({ id: MASTER_ZONE_ID }).map('id').value();
  };

  const setZoneFactor: HemisService['setZoneFactor'] = async ({
    id,
    factor,
    value,
  }) => {
    const zoneIdsToUpdate = await unwindZone({ id });
    await Promise.all(
      _.map(zoneIdsToUpdate, async (zoneId) => {
        await client.put<void>(
          `/WS_ReactiveEnvironmentDataManagement/${zoneId}/settings/${factor}/value`,
          { value }
        );
      })
    );
  };

  const subscribe = async ({
    id,
    listener,
  }: {
    id: string;
    listener: HemisListener;
  }) => {
    if (!wsClient) {
      if (!token) {
        throw new Error('Not logged in');
      }
      wsClient = await createWsClient({ wsUrl, buildingId, token });
    }
    wsClient.addListener({ id, listener });
  };

  const unsubscribe = async ({ id }: { id: string }) => {
    wsClient.removeListener({ id });
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
