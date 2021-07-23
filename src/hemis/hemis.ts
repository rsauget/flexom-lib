import _ from 'lodash';
import axios from 'axios';
import urlencode from 'form-urlencoded';
import { User } from './model/user';
import { Zone, Factor, MASTER_ZONE_ID } from './model/zone';
import { Thing } from './model/thing';

export type HemisService = {
  login: (_: {
    email: string,
    token: string,
    kernelId: string,
  }) => Promise<User>,
  getZones: () => Promise<Zone[]>,
  getZone: (_: { id: string }) => Promise<Zone>,
  setZoneFactor: (_: { id: string, factor: Factor, value: number }) => Promise<void>,
  getThings: () => Promise<Thing[]>,
}

export function createHemisService({
  url,
  userid,
  deviceid,
}: {
  url: string,
  userid: string,
  deviceid: string
  }): HemisService {
  let token: string;

  const client = axios.create({
    baseURL: url,
    headers: {
      'X-Client-Version': '1.10.62',
      'X-Logged-User': userid,
      'X-Client-Id': deviceid,
      'X-Application-Id': 'com.ubiant.flexom',
      'X-Brand-Id': 'Flexom',
      'Content-Type': 'application/x-www-form-urlencoded',
      TE: 'identity',
      'User-Agent': 'BestHTTP',
    },
    transformRequest: [(data, headers) => {
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      return urlencode(data);
    }], 
  });

  const login: HemisService['login'] = async ({
    email,
    token: password,
    kernelId,
  }) => {
    const { data: user } = await client.post<User>(
      '/WS_UserManagement/login',
      {
        email,
        password,
        kernelId,
      },
    );
    token = user.token;
    return user;
  };

  const getZones: HemisService['getZones'] = async () => {
    const { data: zones } = await client.get<Zone[]>(
      '/WS_ZoneManagement/list',
    );
    return zones.map((zone: Zone) => {
      if (zone.id === MASTER_ZONE_ID) {
        return {
          ...zone,
          name: 'Ma Maison',
        };
      } else {
        return zone;
      }
    });
  };

  const getZone: HemisService['getZone'] = async ({ id }) => {
    const { data: settings } = await client.get<Zone['settings']>(
      `/WS_ReactiveEnvironmentDataManagement/${id}/settings`,
    );
    return {
      id,
      name: id,
      settings,
    };
  };

  const getThings = async () => {
    const { data: things } = await client.get<Thing[]>(
      '/intelligent-things/listV2',
    );
    return things;
  };

  const setZoneFactor: HemisService['setZoneFactor'] =
    async ({ id, factor, value }) => {
      const zoneIdsToUpdate = await unwindZone({ id });
      await Promise.all(
        _.chain(zoneIdsToUpdate)
          .map(async id => {
            await client.put<void>(
              `/WS_ReactiveEnvironmentDataManagement/${id}/settings/${factor}/value`,
              { value },
            );
            // await client.post<void>(
            //   `/WS_SystemManagement/event/${id}`,
            //   { event: `${factor}_AUTO` },
            // );
          })
          .value());
    };

  const unwindZone = async ({ id }: Pick<Zone, 'id'>) => {
    if (id === MASTER_ZONE_ID) {
      const zones = await getZones();
      return _.chain(zones)
        .reject({ id: MASTER_ZONE_ID })
        .map('id')
        .value();
    }
    return [id];
  };

  return {
    login,
    getZones,
    getZone,
    setZoneFactor,
    getThings,
  };
}
  



