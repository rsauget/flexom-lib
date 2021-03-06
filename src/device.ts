import crypto from 'crypto';
import { Device } from './ubiant/model/device';

export function createFakeDevice({ email }: { email: string }): Device {
  return {
    first_connection: 0,
    last_connection: 0,
    model: 'asus Nexus 7',
    name: 'Nexus 7',
    operating_system: 'Android',
    uid: crypto.createHash('md5').update(`flexom-lib:${email}`).digest('hex'),
  };
}