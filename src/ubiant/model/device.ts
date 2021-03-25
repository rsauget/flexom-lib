export type Device = {
    first_connection: number;
    last_connection: number;
    model: string;
    name: string;
    operating_system: string;
    uid: string;
    validated?: boolean;
  }