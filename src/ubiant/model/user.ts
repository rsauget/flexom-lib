import { Device } from './device';

type Role = 'BASIC';

export interface User {
  activated: boolean;
  birth_date: string;
  creation_date: number;
  current_device?: Device;
  email: string;
  first_name: string;
  grantedRoles: Role[];
  id: string;
  last_login: number;
  last_name: string;
  locale: string;
  nb_connexion: number;
  nb_max_hemis: number;
  newsletter: boolean;
  pass_reset: boolean;
  roles: Role[];
  tags: string[];
  token: string;
  user_brand: string;
  user_json: string;
  username: string;
}
