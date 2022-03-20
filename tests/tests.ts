import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as Flexom from '../src';
import { Building } from '../src/ubiant/model/building';
import { User as UbiantUser } from '../src/ubiant/model/user';
import { User as HemisUser } from '../src/hemis/model/user';
import { UbiantService } from '../src/ubiant/ubiant';

interface FlexomTestData {
  ubiantUser: UbiantUser;
  hemisUser: HemisUser;
  buildings: Building[];
  ubiant: UbiantService;
}

describe('Integration with Flexom APIs', () => {
  describe('Login', () => {
    it.only('correct credentials', async () => {
      const flexom = await Flexom.createClient({
        email: process.env.FLEXOM_EMAIL!,
        password: process.env.FLEXOM_PASSWORD!,
      });
      const { ubiant, ubiantUser, hemisUser, buildings } =
        flexom.testData as FlexomTestData;
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
      } catch (error: unknown) {
        expect(error).to.be.an.instanceOf(Error);
        expect((error as Error).message).to.equal(
          'Request failed with status code 401'
        );
      }
    });
  });

  describe.skip('Commands', () => {
    it('Toggle light in test zone', async () => {
      const id = process.env.FLEXOM_TEST_ZONE!;
      const factor = 'BRI';
      const flexom = await Flexom.createClient({
        email: process.env.FLEXOM_EMAIL!,
        password: process.env.FLEXOM_PASSWORD!,
      });

      const settings = await flexom.getZoneSettings({ id });
      await flexom.setZoneFactor({
        id,
        factor,
        value: settings.BRI.value === 1 ? 0 : 1,
      });
      await flexom.setZoneFactor({
        id,
        factor,
        value: settings.BRI.value,
      });
      await flexom.disconnect();
    });

    it.skip('Toggle window covering in test zone', async () => {
      const id = process.env.FLEXOM_TEST_ZONE!;
      const factor = 'BRIEXT';
      const flexom = await Flexom.createClient({
        email: process.env.FLEXOM_EMAIL!,
        password: process.env.FLEXOM_PASSWORD!,
      });

      const settings = await flexom.getZoneSettings({ id });
      await flexom.setZoneFactor({
        id,
        factor,
        value: settings.BRIEXT.value === 1 ? 0 : 1,
      });
      await flexom.setZoneFactor({ id, factor, value: settings.BRIEXT.value });
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

    it('Listen events', async () => {
      const zoneId = process.env.FLEXOM_TEST_ZONE!;
      const flexom = await Flexom.createClient({
        email: process.env.FLEXOM_EMAIL!,
        password: process.env.FLEXOM_PASSWORD!,
      });
      const id = '#testListener';
      await flexom.subscribe({
        id,
        zoneId,
        listener: (data) => console.log(data),
      });
      setTimeout(async () => flexom.disconnect(), 30000);
    });
  });
});
