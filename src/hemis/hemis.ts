import { User } from './model/user';
import { Zone, Factor, Settings, MASTER_ZONE_ID } from './model/zone';
import { HttpClient } from 'typed-rest-client/HttpClient';
import { IHeaders } from 'typed-rest-client/Interfaces';
import urlencode from 'form-urlencoded';
import { queue } from '../queue';
import { Thing } from './model/thing';

export class Hemis {
  private url: string;
  private client: HttpClient;
  private userid: string;
  private deviceid: string;
  private token?: string;

  private get headers(): IHeaders {
    return {
      'X-Client-Version': '1.10.62',
      'X-Logged-User': this.userid,
      'X-Client-Id': this.deviceid,
      'X-Application-Id': 'com.ubiant.flexom',
      'X-Brand-Id': 'Flexom',
      'Content-Type': 'application/x-www-form-urlencoded',
      TE: 'identity',
      ...(this.token && { Authorization: `Bearer ${this.token}`}),
    };
  }

  public constructor(
    url: string,
    userid: string,
    deviceid: string,
    token?: string,
  ) {
    this.userid = userid;
    this.deviceid = deviceid;
    this.url = url;
    this.token = token;
    this.client = new HttpClient('BestHTTP');
  }

  public async login(
    email: string,
    token: string,
    kernelId: string,
  ): Promise<User | null> {
    try {
      const response = await this.client.post(
        `${this.url}/WS_UserManagement/login`,
        urlencode({
          email: email,
          password: token,
          kernelId: kernelId,
        }),
        this.headers,
      );
      if (response.message.statusCode === 200) {
        const user = JSON.parse(await response.readBody());
        this.token = user.token;
        return user;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  public async getZones(): Promise<Zone[]> {
    const response = await this.client.get(
      `${this.url}/WS_ZoneManagement/list`,
      this.headers,
    );
    if (response.message.statusCode === 401) {
      throw new Error('Unauthorized');
    }
    const zones = JSON.parse(await response.readBody());
    return zones.map((zone: Zone) => {
      if (zone.id === 'MyHemis') {
        return {
          ...zone,
          name: 'Ma Maison',
        };
      } else {
        return zone;
      }
    });
  }

  public getZone = queue.wrap(
    async (id: string): Promise<Zone> => {
      const response = await this.client.get(
        `${this.url}/WS_ReactiveEnvironmentDataManagement/${id}/settings`,
        this.headers,
      );
      const zone = {
        id,
        name: id,
        settings: JSON.parse(await response.readBody()),
      };
      return zone;
    },
  );

  public async getThings() : Promise<Thing[]>{
    const response = await this.client.get(
      `${this.url}/intelligent-things/listV2`,
      this.headers,
    );
    const things = JSON.parse(await response.readBody());
    return things;
  }

  public async setZoneFactor(id: string, factor: Factor, value: number) {
    await this.client.put(
      `${this.url}/WS_ReactiveEnvironmentDataManagement/${id}/settings/${factor}/value`,
      urlencode({ value }),
      this.headers,
    );
    await this.client.put(
      `${this.url}/WS_SystemManagement/event/${id}`,
      urlencode({ event: `${factor}_AUTO` }),
      this.headers,
    );
  }

  public updateZone = queue.wrap(async (zone: Zone) => {
    await Promise.all(
      Object.entries(zone.settings).map(async (entry) => {
        const [factor, data] = entry as [Factor, Settings];
        if (!data) {
          return;
        }
        if (zone.id === MASTER_ZONE_ID) {
          const zones = await this.getZones();
          if (!zones) {
            return;
          }
          await Promise.all(
            zones
              .filter((zone) => zone.id !== MASTER_ZONE_ID)
              .map(async (zone) => {
                zone.settings = { [factor]: data };
                await this.updateZone(zone);
              }),
          );
        } else {
          this.setZoneFactor(zone.id, factor, data.value);
        }
      }),
    );
    return await this.getZone(zone.id);
  });
}
