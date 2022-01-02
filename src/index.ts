import _ from 'lodash';
import WebSocket from 'ws';
import retry from 'async-retry';
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
  async function retry429<T>(fn: () => Promise<T>) {
    return retry(async (bail) => {
      try {
        return await fn();
      } catch (err: unknown) {
        if (_.get(err, 'response.status') === 429) {
          logger.warn('Too many login requests, waiting to retry...');
        } else {
          bail(err as Error);
        }
        throw err;
      }
    });
  }

  const ubiant = createUbiantService();
  let ubiantUser = await retry429(async () =>
    ubiant.login({ email, password })
  );
  const buildings = await ubiant.getBuildings();
  if (_.isEmpty(buildings)) {
    throw new FlexomLibError('No building found');
  }
  // TODO: handle multiple buildings
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const building = _.first(buildings)!;
  const hemis = createHemisService({
    baseUrl: building.hemis_base_url,
    wsUrl: building.hemis_stomp_url,
    userId: ubiantUser.id,
    buildingId: building.buildingId,
    logger,
  });
  let hemisUser = await retry429(async () =>
    hemis.login({
      email: ubiantUser.email,
      token: building.authorizationToken,
      kernelId: building.kernel_slot,
    })
  );

  function withAuth<T extends unknown[], U>(fn: (...args: T) => Promise<U>) {
    return async (...args: T) => {
      if (!ubiant.isTokenValid()) {
        ubiantUser = await retry429(async () =>
          ubiant.login({ email, password })
        );
        hemisUser = await retry429(async () =>
          hemis.login({
            email: ubiantUser.email,
            token: building.authorizationToken,
            kernelId: building.kernel_slot,
          })
        );
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
