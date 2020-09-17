import { User } from './user';

type HemisLevel = 'OWNER';
type Level = 'Owner';
type Type = 'BUILDING_AUTHORIZATION';

export interface Authorization {
  activated: boolean;
  creation_date: number;
  entity_id: string;
  eraseAuthorizations: boolean;
  hemis_level: HemisLevel;
  id: string;
  last_update: number;
  level: Level;
  name: string;
  token: string;
  transfer: boolean;
  type: Type;
  user: User;
}
