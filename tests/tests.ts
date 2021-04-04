/* eslint-disable no-console */
import * as Flexom from '../src';
import { describe, it } from 'mocha';
import { expect } from 'chai';
import { Device } from '../src/ubiant/model/device';
import { Building } from '../src/ubiant/model/building';
import { User as UbiantUser } from '../src/ubiant/model/user';
import { User as HemisUser } from '../src/hemis/model/user';
import { UbiantService } from '../src/ubiant/ubiant';
interface FlexomTestData {
  auth: {
    device: Device,
    ubiantUser: UbiantUser,
    hemisUser: HemisUser,
    buildings: Building[],
    ubiant: UbiantService
  }
}
describe('Integration with Flexom APIs', () => {
  describe('Login', () => {
    it('correct credentials', async () => {
      const flexom = await Flexom.createClient({ email: process.env.FLEXOM_EMAIL!, password: process.env.FLEXOM_PASSWORD! });
      const { auth } = flexom.testData as FlexomTestData;
      const { ubiant, ubiantUser, hemisUser, device, buildings } = auth;
      expect(ubiant.isTokenValid()).to.be.true;
      expect(ubiantUser.email).to.equal(process.env.FLEXOM_EMAIL),
      expect(ubiantUser.current_device!.uid).to.eql(device.uid);
      expect(buildings.length).to.be.greaterThan(0);
      const building = buildings[0];
      expect(hemisUser.role).to.equal(building.auth_hemis_level);
    });
    it('incorrect credentials', async () => {
      try {
        await Flexom.createClient({ email: process.env.FLEXOM_EMAIL!, password: 'wrong_password' });
        expect.fail();
      } catch (error) {
        expect(error.message).to.equal('Request failed with status code 401');
      }
    });
  });

  describe.skip('Commands', () => {
    it('Toggle light in test zone', async () => {
      const id = process.env.FLEXOM_TEST_ZONE!;
      const factor = 'BRI';
      const flexom = await Flexom.createClient({ email: process.env.FLEXOM_EMAIL!, password: process.env.FLEXOM_PASSWORD! });
      await setFactorAndWaitForChange({ flexom, id, factor, value: 1 });
      await setFactorAndWaitForChange({ flexom, id, factor, value: 0 });
    });

    it('Toggle window covering in test zone', async () => {
      const id = process.env.FLEXOM_TEST_ZONE!;
      const factor = 'BRIEXT';
      const flexom = await Flexom.createClient({ email: process.env.FLEXOM_EMAIL!, password: process.env.FLEXOM_PASSWORD! });
      await setFactorAndWaitForChange({ flexom, id, factor, value: 0 });
      await setFactorAndWaitForChange({ flexom, id, factor, value: 1 });
    });
  });

  describe.skip('Misc', () => {
    it('Get things', async () => {
      const flexom = await Flexom.createClient({ email: process.env.FLEXOM_EMAIL!, password: process.env.FLEXOM_PASSWORD! });
      const things = await flexom.getThings();
      console.log(JSON.stringify(things, null, 2));
    });
  });

});

async function setFactorAndWaitForChange({
  flexom,
  id,
  factor,
  value,
}: {
  flexom: Flexom.Client
  } & Parameters<Flexom.Client['setZoneFactor']>[0],
) {
  console.log(`set ${factor} to ${value}`);
  await flexom.setZoneFactor({ id, factor, value });
  let currentValue: number | undefined = undefined;
  while (currentValue !== value) {
    await sleep(3000);
    const { settings } = await flexom.getZone({ id });
    currentValue = settings[factor].value;
    console.log(`${factor} = ${currentValue} (expecting ${value})`);
  }
}

async function sleep(delay: number) {
  return new Promise(resolve => setTimeout(resolve, delay));
}