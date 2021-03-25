import _ from 'lodash';
import { createFakeDevice } from './device';
import { createHemisService, HemisService } from './hemis/hemis';
import { Thing } from './hemis/model/thing';
import { Factor, Zone } from './hemis/model/zone';
import { createUbiantService } from './ubiant/ubiant';

type Client = Omit<HemisService, 'login'> & {
  testData?: unknown,
}

export {
  Thing,
  Zone,
  Factor,
  Client,
  createClient,
};
  
function throwError(msg: string): never {
  throw new Error(`[flexom-lib] ERROR: ${msg}`);
}

async function login({ email, password }: { email: string, password: string }) {
  const device = createFakeDevice({ email });
  const ubiant = createUbiantService({ device });
  const ubiantUser = await ubiant.login({ email, password });
  const buildings = await ubiant.getBuildings();
  if (_.isEmpty(buildings)) {
    return throwError('No building found');
  }
  // TODO: handle multiple buildings
  const building = _.first(buildings)!;
  const hemis = createHemisService({ url: building.hemis_base_url, userid: ubiantUser.id, deviceid: device.uid });
  const hemisUser = await hemis.login({
    email: ubiantUser.email,
    token: building.authorizationToken,
    kernelId: building.kernel_slot,
  });
  return {
    device,
    ubiant,
    ubiantUser,
    hemis,
    hemisUser,
    buildings,
  };
}

async function createClient({ email, password }: { email: string, password: string }): Promise<Client> {
  let auth = await login({ email, password });

  function withAuth<T extends unknown[], U>(fn: (_: typeof auth) => (...args: T) => Promise<U>) {
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
    getZone: withAuth(({ hemis }) => hemis.getZone),
    setZoneFactor: withAuth(({ hemis }) => hemis.setZoneFactor),
    ...(process.env.NODE_ENV === 'test' && { testData: { auth } }),
  };
}