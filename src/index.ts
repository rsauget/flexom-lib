import _ from 'lodash';
import WebSocket from 'ws';
import { createHemisService, HemisService } from './hemis/hemis';
import { Thing } from './hemis/model/thing';
import { Factor, Zone } from './hemis/model/zone';
import { Auth } from './model/auth';
import { createUbiantService } from './ubiant/ubiant';

Object.assign(global, { WebSocket });

type Client = Omit<HemisService, 'login' | 'logout'> & {
  disconnect: HemisService['logout'];
  testData?: unknown;
};

export { Thing, Zone, Factor, Client, createClient };

function throwError(msg: string): never {
  throw new Error(`[flexom-lib] ERROR: ${msg}`);
}

async function login({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<Auth> {
  const ubiant = createUbiantService();
  const ubiantUser = await ubiant.login({ email, password });
  const buildings = await ubiant.getBuildings();
  if (_.isEmpty(buildings)) {
    return throwError('No building found');
  }
  // TODO: handle multiple buildings
  const building = _.first(buildings)!;
  const hemis = createHemisService({
    baseUrl: building.hemis_base_url,
    wsUrl: building.hemis_stomp_url,
    userId: ubiantUser.id,
    buildingId: building.buildingId,
  });
  const hemisUser = await hemis.login({
    email: ubiantUser.email,
    token: building.authorizationToken,
    kernelId: building.kernel_slot,
  });
  return {
    ubiant,
    ubiantUser,
    hemis,
    hemisUser,
    buildings,
  };
}

async function createClient({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<Client> {
  let auth = await login({ email, password });

  function withAuth<T extends unknown[], U>(
    fn: (auth: Auth) => (...args: T) => Promise<U>
  ) {
    return async (...args: T) => {
      if (!auth?.ubiant?.isTokenValid()) {
        auth = await login({ email, password });
      }
      return fn(auth)(...args);
    };
  }

  return {
    getThings: withAuth(({ hemis }) => hemis.getThings),
    getZones: withAuth(({ hemis }) => hemis.getZones),
    getZoneSettings: withAuth(({ hemis }) => hemis.getZoneSettings),
    setZoneFactor: withAuth(({ hemis }) => hemis.setZoneFactor),
    subscribe: withAuth(({ hemis }) => hemis.subscribe),
    unsubscribe: withAuth(({ hemis }) => hemis.unsubscribe),
    disconnect: withAuth(({ hemis }) => hemis.logout),

    ...(process.env.NODE_ENV === 'test' && { testData: { auth } }),
  };
}
