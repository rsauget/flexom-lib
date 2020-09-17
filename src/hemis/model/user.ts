type Role = 'OWNER';

export interface User {
  hemisVersion: string;
  offset: number;
  permissions: string[];
  role: Role;
  timeZone: string;
  token: string;
}
