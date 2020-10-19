import jwt from 'jsonwebtoken';
import moment from 'moment';
import { User } from './model/user';
import { Device } from './model/device';
import { RestClient } from 'typed-rest-client/RestClient';
import { Authorization } from './model/authorization';
import { Building } from './model/building';

interface UbiantToken {
  sub: string;
  iss: string;
  exp: number;
  iat: number;
  brand: string;
  jti: string;
  email: string;
}

export class Ubiant {
  private device: Device;
  private client: RestClient;
  private token?: string;
  private get options() {
    return {
      additionalHeaders: {
        Authorization: `Bearer ${this.token}`,
        TE: 'identity',
      },
    };
  }

  public constructor(device: Device, token?: string) {
    this.device = device;
    this.token = token;
    this.client = new RestClient('BestHTTP', 'https://hemisphere.ubiant.com');
  }

  public async login(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.client.create<User>('/users/signin', {
        device: this.device,
        email: email,
        password: password,
      });
      if (user.result) {
        this.token = user.result.token;
        return user.result;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  public async getBuildings(): Promise<Building[] | null> {
    const buildings = await this.client.get<Building[]>(
      '/buildings/mine/infos',
      this.options,
    );
    return buildings.result;
  }

  public async getAuthorizations(
    building: Building,
  ): Promise<Authorization[] | null> {
    const authorizations = await this.client.get<Authorization[]>(
      `/buildings/${building.buildingId}/authorizations`,
      this.options,
    );
    return authorizations.result;
  }

  public isTokenValid() {
    if (!this.token) {
      return false;
    }
    const tokenData = jwt.decode(this.token) as UbiantToken;
    const expirationDate = moment.unix(tokenData.exp);
    return moment().add(1, 'hours').isBefore(expirationDate);
  }
}
