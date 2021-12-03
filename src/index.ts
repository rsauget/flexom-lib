import _ from 'lodash';
import WebSocket from 'ws';
import { FlexomLibError } from './error';
import { createHemisService, HemisService } from './hemis/hemis';
import { Thing } from './hemis/model/thing';
import { Factor, Zone } from './hemis/model/zone';
import { getDefaultLogger, Logger } from './logger';
import { Auth } from './model/auth';
import { createUbiantService } from './ubiant/ubiant';

Object.assign(global, { WebSocket });

type Client = Omit<HemisService, 'login' | 'logout'> & {
  disconnect: HemisService['logout'];
  testData?: unknown;
};

export { Thing, Zone, Factor, Client, createClient };

async function login({
  email,
  password,
  logger,
}: {
  email: string;
  password: string;
  logger: Logger;
}): Promise<Auth> {
  const ubiant = createUbiantService();
  const ubiantUser = await ubiant.login({ email, password });
  const buildings = await ubiant.getBuildings();
  if (_.isEmpty(buildings)) {
    throw new FlexomLibError('No building found');
  }
  // TODO: handle multiple buildings
  const building = _.first(buildings)!;
  const hemis = createHemisService({
    baseUrl: building.hemis_base_url,
    wsUrl: building.hemis_stomp_url,
    userId: ubiantUser.id,
    buildingId: building.buildingId,
    logger,
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
  logger = getDefaultLogger(),
}: {
  email: string;
  password: string;
  logger?: Logger;
}): Promise<Client> {
  let auth = await login({ email, password, logger });

  function withAuth<T extends unknown[], U>(
    fn: (auth: Auth) => (...args: T) => Promise<U>
  ) {
    return async (...args: T) => {
      if (!auth?.ubiant?.isTokenValid()) {
        auth = await login({ email, password, logger });
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
