type Role = 'OWNER';

export type User = {
  hemisVersion: string;
  offset: number;
  permissions: string[];
  role: Role;
  timeZone: string;
  token: string;
};
