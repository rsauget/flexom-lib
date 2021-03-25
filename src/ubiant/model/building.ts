type Address = {
  address: string;
  c: string;
  city: string;
  county: string;
  formatted_address: string;
  id: string;
  latitude: number;
  longitude: number;
  p: string;
  region: string;
  street_name: string;
};

export type Building = {
    address: Address;
    auth_activated: boolean;
    auth_hemis_level: string;
    auth_transfer: boolean;
    authorizationId: string;
    authorizationToken: string;
    build_period: string;
    buildingId: string;
    building_brand: string;
    description: string;
    floor: string;
    hemis_base_url: string;
    hemis_stomp_url: string;
    image_url: string;
    is_connected: boolean;
    kernel_slot: string;
    kernel_state: string;
    label: string;
    nb_hemis_key: boolean;
    nickname: string;
    owner: {
      email: string;
      first_name: string;
      last_name: string;
      user_brand: string;
      user_id: string;
    };
    project: string;
    publicSheetInfos: number;
    stairwell: string;
    superficy: number;
    timezone: string;
    type: string;
  }