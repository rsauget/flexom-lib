import { Zone } from './zone';

type Embodiement = 'REAL';
type Category = 'DEFAULT';
type Protocol = 'ENOCEAN' | 'WEB_SERVICES' | 'THREAD' | 'OVP' | 'IO';
type State =
  | 'OK'
  | 'PAIRED'
  | 'UNREACHABLE'
  | 'MUTE'
  | 'UNKNOWN'
  | 'KO'
  | 'NOT_NEEDED';

interface Description {
  name: string;
  value: string;
  registrationDate: number;
  lastModificationDate: number;
  modifiable: boolean;
  available: boolean;
  information: null;
  log: null;
}

export interface Thing {
  id: string;
  externalId: string | null;
  comID: string;
  firmwareVersion: string | null;
  version: string | null;
  creationTimeStamp: number;
  embodiment: Embodiement;
  name: string;
  zoneInformation: Zone;
  typeInformation: {
    id: string;
    name: string;
    category: Category;
    remoteCommissioning: boolean;
    useTrigger: boolean | null;
    splittable: boolean;
    customizable: boolean;
    hasActuators: boolean;
    hasSensors: boolean;
    protocol: Protocol;
    sensorsFactor: { [key: string]: string };
    actuatorsFactors: { [key: string]: string[] };
    targetZone: null;
    descriptions: Description[];
  };
  correspondingVirtualItID: null;
  hardwareCustomizations: {
    hardwareTypeID: string;
    descriptions: Description[];
  }[];
  specifiedGateway: string;
  specifiedGatewayEnable: boolean;
  accountID: string | null;
  accountState: null;
  state: State;
  compositeState: {
    o: State;
    pO: State;
    oTs: number;
    pOTs: number;
    oC: string; // TODO type
    pOC: string; // TODO type
    p: State;
    pP: State;
    pTs: number;
    pPTs: number;
    pC: string; // TODO type
    pPC: string; // TODO type
    r: State;
    pR: State;
    rTs: number;
    pRTs: number;
    rC: string; // TODO type
    pRC: string; // TODO type
  };
  rssi: number;
  locked: boolean;
  hardwareTypeComIDs: { [key: string]: string };
}
