import { FAKE_DEVICE } from './device';
import { Hemis } from './hemis/hemis';
import { Thing } from './hemis/model/thing';
import { Factor, Zone } from './hemis/model/zone';
// import { Auth } from './model/auth';
import { Ubiant } from './ubiant/ubiant';

interface Client {
  getThings: () => Promise<Thing[]>,
  getZones: () => Promise<Zone[]>,
  getZone: (id: string) => Promise<Zone>,
  setZoneFactor: (id: string, factor: Factor, value: number) => Promise<void>
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
  const device = FAKE_DEVICE;
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
  // const auth = {
  //   device,
  //   ubiant: {
  //     token: ubiantUser.token,
  //   },
  //   hemis: {
  //     base_url: building.hemis_base_url,
  //     user_id: ubiantUser.id,
  //     token: hemisUser.token,
  //   },
  // };
  return {
    async getThings() {
      return hemis.getThings();
    },

    async getZones() {
      return hemis.getZones();
    },

    async getZone(id: string) {
      return hemis.getZone(id);
    },

    async setZoneFactor(id: string, factor: Factor, value: number) {
      return hemis.setZoneFactor(id, factor, value);
    },
  };
}