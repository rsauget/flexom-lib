import * as Flexom from '../src';
import path from 'path';
import dotenv from 'dotenv';
import { describe, it } from 'mocha';
import { expect } from 'chai';
import { Device } from '../src/ubiant/model/device';
import { Building } from '../src/ubiant/model/building';
import { User as UbiantUser } from '../src/ubiant/model/user';
import { User as HemisUser } from '../src/hemis/model/user';
import { Ubiant } from '../src/ubiant/ubiant';

interface FlexomTestData {
  auth: {
    device: Device,
    ubiantUser: UbiantUser,
    hemisUser: HemisUser,
    buildings: Building[],
    ubiant: Ubiant
  }
}
describe('Integration with Flexom APIs', () => {
  before(() => {
    dotenv.config({ path: path.join(__dirname, '.env') });
  });

  describe('Login', () => {
    it('correct credentials', async () => {
      const flexom = await Flexom.createClient(process.env.FLEXOM_EMAIL!, process.env.FLEXOM_PASSWORD!);
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
        await Flexom.createClient(process.env.FLEXOM_EMAIL!, 'wrong_password');
        expect.fail();
      } catch (error) {
        expect(error.message).to.equal('Flexom lib error: Ubiant login failed');
      }
    });
  });
  
});