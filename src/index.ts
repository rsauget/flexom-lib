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

async function login(email: string, password: string) {
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
  return {
    device,
    ubiant,
    ubiantUser,
    hemis,
    hemisUser,
    buildings,
  };
}

async function createClient(email: string, password: string): Promise<Client> {  
  let auth = await login(email, password);

  const getAuth = async () => {
    if (!auth?.ubiant?.isTokenValid()) {
      auth = await login(email, password);
    }
    return auth;
  };
  
  return {
    async getThings() {
      const { hemis } = await getAuth();
      return hemis.getThings();
    },
    async getZones() {
      const { hemis } = await getAuth();
      return hemis.getZones();
    },
    async getZone(id: string) {
      const { hemis } = await getAuth();
      return hemis.getZone(id);
    },
    async setZoneFactor(id: string, factor: Factor, value: number) {
      const { hemis } = await getAuth();
      return hemis.setZoneFactor(id, factor, value);
    },
    ...(process.env.NODE_ENV === 'test' && { testData: { auth } }),
  };
}