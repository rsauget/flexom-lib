import { HemisService } from '../hemis/hemis';
import { User as HemisUser } from '../hemis/model/user';
import { Building } from '../ubiant/model/building';
import { User as UbiantUser } from '../ubiant/model/user';
import { UbiantService } from '../ubiant/ubiant';

export type Auth = {
  ubiant: UbiantService;
  ubiantUser: UbiantUser;
  hemis: HemisService;
  hemisUser: HemisUser;
  buildings: Building[];
};
