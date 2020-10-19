import { createFakeDevice } from './device';
import { Hemis } from './hemis/hemis';
import { Thing } from './hemis/model/thing';
import { Factor, Zone } from './hemis/model/zone';
// import { Auth } from './model/auth';
import { Ubiant } from './ubiant/ubiant';

interface Client {
  getThings: () => Promise<Thing[]>,
  getZones: () => Promise<Zone[]>,
  getZone: (id: string) => Promise<Zone>,
  setZoneFactor: (id: string, factor: Factor, value: number) => Promise<void>,
  testData?: unknown,
}

export {
  Thing,
  Zone,
  Factor,
  Client,
  createClient,
};

function FlexomError(msg: string) {
  return new Error(`Flexom lib error: ${msg}`);
}

async function createClient(email: string, password: string): Promise<Client> {
  const device = createFakeDevice(email);
  const ubiant = new Ubiant(device);
  const ubiantUser = await ubiant.login(email, password);
  if (!ubiantUser) {
    throw FlexomError('Ubiant login failed');
  }
  const buildings = await ubiant.getBuildings();
  if (!buildings || buildings.length === 0) {
    throw FlexomError('No building found');
  }
  // TODO: handle multiple buildings
  const building = buildings[0];
  const hemis = new Hemis(building.hemis_base_url, ubiantUser.id, device.uid);
  const hemisUser = await hemis.login(
    ubiantUser.email,
    building.authorizationToken,
    building.kernel_slot,
  );
  if (!hemisUser) {
    throw FlexomError('Hemis login failed');
  }
  const auth = {
    device,
    ubiant,
    ubiantUser,
    hemis,
    hemisUser,
    buildings,
  };
  const refreshToken = async () => {
    if (ubiant.isTokenValid()) {
      return;
    }
    await ubiant.login(email, password);
  };
  return {
    async getThings() {
      await refreshToken();
      return hemis.getThings();
    },
    async getZones() {
      await refreshToken();
      return hemis.getZones();
    },
    async getZone(id: string) {
      await refreshToken();
      return hemis.getZone(id);
    },
    async setZoneFactor(id: string, factor: Factor, value: number) {
      await refreshToken();
      return hemis.setZoneFactor(id, factor, value);
    },
    ...(process.env.NODE_ENV === 'test' && { testData: { auth } }),
  };
}