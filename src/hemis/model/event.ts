import { Factor } from './zone';

type EventType =
  | 'ACTUATOR_TARGET_STATE'
  | 'ACTUATOR_HARDWARE_STATE'
  | 'ACTUATOR_CURRENT_STATE'
  | 'SENSOR_STATE'
  | 'IT_STATE'
  | 'FACTOR_TARGET_STATE'
  | 'FACTOR_CURRENT_STATE'
  | 'OBJECTIVE_STATE'
  | 'DATA_PROVIDER'
  | 'ENTITY_MANAGEMENT';

type EventCategory = 'STATE_EVENT' | 'DATA_PROVIDER_EVENT' | 'HEMIS_ACTION';

type EventBase = {
  type: EventType;
  timestamp: number;
  category: EventCategory;
  zoneId?: string;
  objectiveId?: string;
  factorId?: Factor;
  value?: unknown;
};

type ActuatorHardwareStateEvent = EventBase & {
  type: 'ACTUATOR_HARDWARE_STATE';
  timestamp: number;
  value: {
    value: number;
  };
  factorId: Factor;
};

type OtherEvent = EventBase & {
  type: Exclude<EventType, 'ACTUATOR_HARDWARE_STATE'>;
};

type Event = ActuatorHardwareStateEvent | OtherEvent;

export type HemisListener = (data: Event) => void;
