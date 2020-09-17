import { Device } from '../ubiant/model/device';

export interface Auth {
  device: Device;
  ubiant: {
    token: string;
  };
  hemis?: {
    base_url: string;
    user_id: string;
    token: string;
  };
}
