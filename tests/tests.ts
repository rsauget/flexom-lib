/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-console */
import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as Flexom from '../src';
import { Device } from '../src/ubiant/model/device';
import { Building } from '../src/ubiant/model/building';
import { User as UbiantUser } from '../src/ubiant/model/user';
import { User as HemisUser } from '../src/hemis/model/user';
import { UbiantService } from '../src/ubiant/ubiant';

interface FlexomTestData {
  auth: {
    device: Device;
    ubiantUser: UbiantUser;
    hemisUser: HemisUser;
    buildings: Building[];
    ubiant: UbiantService;
  };
}

async function sleep(delay: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

describe('Integration with Flexom APIs', () => {
  describe.skip('Login', () => {
    it('correct credentials', async () => {
      const flexom = await Flexom.createClient({
        email: process.env.FLEXOM_EMAIL!,
        password: process.env.FLEXOM_PASSWORD!,
      });
      const { auth } = flexom.testData as FlexomTestData;
      const { ubiant, ubiantUser, hemisUser, buildings } = auth;
      expect(ubiant.isTokenValid()).to.be.true;
      expect(ubiantUser.email).to.equal(process.env.FLEXOM_EMAIL);
      expect(buildings.length).to.be.greaterThan(0);
      const building = buildings[0];
      expect(hemisUser.role).to.equal(building.auth_hemis_level);
    });
    it('incorrect credentials', async () => {
      try {
        await Flexom.createClient({
          email: process.env.FLEXOM_EMAIL!,
          password: 'wrong_password',
        });
        expect.fail();
      } catch (error: any) {
        expect(error.message).to.equal('Request failed with status code 401');
      }
    });
  });

  describe('Commands', () => {
    it('Toggle light in test zone', async () => {
      const id = process.env.FLEXOM_TEST_ZONE!;
      const factor = 'BRI';
      const flexom = await Flexom.createClient({
        email: process.env.FLEXOM_EMAIL!,
        password: process.env.FLEXOM_PASSWORD!,
      });

      let currentValue: number | undefined;
      await flexom.subscribe({
        id: 'test',
        listener: (data) => {
          console.log(JSON.stringify(data, null, 2));
          if (
            data.type === 'ACTUATOR_HARDWARE_STATE' &&
            data.zoneId === id &&
            data.factorId === factor
          ) {
            currentValue = data.value.value;
          }
        },
      });
      await flexom.setZoneFactor({ id, factor, value: 1 });
      while (currentValue !== 1) {
        await sleep(3000);
      }

      currentValue = undefined;
      await flexom.setZoneFactor({ id, factor, value: 0 });
      while (currentValue !== 0) {
        await sleep(3000);
      }

      await flexom.disconnect();
    });

    it.only('Toggle window covering in test zone', async () => {
      const id = process.env.FLEXOM_TEST_ZONE!;
      const factor = 'BRIEXT';
      const flexom = await Flexom.createClient({
        email: process.env.FLEXOM_EMAIL!,
        password: process.env.FLEXOM_PASSWORD!,
      });

      let currentValue: number | undefined;
      await flexom.subscribe({
        id: 'test',
        listener: (data) => {
          console.log(JSON.stringify(data, null, 2));
          if (
            data.type === 'ACTUATOR_HARDWARE_STATE' &&
            data.zoneId === id &&
            data.factorId === factor
          ) {
            currentValue = data.value.value;
          }
        },
      });
      await flexom.setZoneFactor({ id, factor, value: 0 });
      while (currentValue !== 0) {
        await sleep(3000);
      }

      currentValue = undefined;
      await flexom.setZoneFactor({ id, factor, value: 1 });
      while (currentValue !== 1) {
        await sleep(3000);
      }

      await flexom.disconnect();
    });
  });

  describe.skip('Misc', () => {
    it('Get things', async () => {
      const flexom = await Flexom.createClient({
        email: process.env.FLEXOM_EMAIL!,
        password: process.env.FLEXOM_PASSWORD!,
      });
      const things = await flexom.getThings();
      console.log(JSON.stringify(things, null, 2));
    });
  });
});
