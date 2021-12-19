import _ from 'lodash';
import WebSocket from 'ws';
import { FlexomLibError } from './error';
import { createHemisService, HemisService } from './hemis/hemis';
import { Thing } from './hemis/model/thing';
import { Factor, Zone } from './hemis/model/zone';
import { getDefaultLogger, Logger } from './logger';
import { createUbiantService } from './ubiant/ubiant';

Object.assign(global, { WebSocket });

type Client = Omit<HemisService, 'login' | 'logout'> & {
  disconnect: HemisService['logout'];
  testData?: unknown;
};

export { Thing, Zone, Factor, Client, createClient };

async function createClient({
  email,
  password,
  logger = getDefaultLogger(),
}: {
  email: string;
  password: string;
  logger?: Logger;
}): Promise<Client> {
  const ubiant = createUbiantService();
  let ubiantUser = await ubiant.login({ email, password });
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
  let hemisUser = await hemis.login({
    email: ubiantUser.email,
    token: building.authorizationToken,
    kernelId: building.kernel_slot,
  });

  function withAuth<T extends unknown[], U>(fn: (...args: T) => Promise<U>) {
    return async (...args: T) => {
      if (!ubiant.isTokenValid()) {
        ubiantUser = await ubiant.login({ email, password });
        hemisUser = await hemis.login({
          email: ubiantUser.email,
          token: building.authorizationToken,
          kernelId: building.kernel_slot,
        });
      }
      return fn(...args);
    };
  }

  return {
    getThings: withAuth(hemis.getThings),
    getZones: withAuth(hemis.getZones),
    getZoneSettings: withAuth(hemis.getZoneSettings),
    setZoneFactor: withAuth(hemis.setZoneFactor),
    subscribe: withAuth(hemis.subscribe),
    unsubscribe: withAuth(hemis.unsubscribe),
    disconnect: withAuth(hemis.logout),

    ...(process.env.NODE_ENV === 'test' && {
      testData: { ubiantUser, hemisUser, buildings, ubiant },
    }),
  };
}
