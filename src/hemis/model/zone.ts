export type Factor = 'BRI' | 'BRIEXT' | 'TMP';
export function isFactor(arg: string): arg is Factor {
  return ['BRI', 'BRIEXT', 'TMP'].includes(arg);
}

export const MASTER_ZONE_ID = 'MyHemis';

type Unit = '%';

export interface Settings {
  actuatorCount?: number;
  hiddenValue?: null;
  hiddenValueEnd?: null;
  max?: number;
  min?: number;
  step?: number;
  unit?: Unit;
  value: number;
}

export interface Zone {
  id: string;
  name: string;
  parentId?: string | null;
  surface?: string;
  type?: string | null;
  settings: {
    [factor in Factor]?: Settings;
  };
}
