import axios from 'axios';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import { User } from './model/user';
import { UbiantToken } from './model/authorization';
import { Building } from './model/building';

export type UbiantService = {
  login: (_: { email: string; password: string }) => Promise<User>;
  getBuildings: () => Promise<Building[]>;
  isTokenValid: () => boolean;
  // getAuthorizations: () => Promise<Authorization[]>
};

export function createUbiantService(): UbiantService {
  let token: string;

  const client = axios.create({
    baseURL: 'https://hemisphere.ubiant.com',
    headers: {
      'Content-Type': 'application/json',
    },
    transformRequest: [
      (data, headers) => {
        if (headers && token) {
          // eslint-disable-next-line no-param-reassign
          headers.Authorization = `Bearer ${token}`;
        }
        return JSON.stringify(data);
      },
    ],
  });

  const login: UbiantService['login'] = async ({ email, password }) => {
    const { data: user } = await client.post<User>('/users/signin', {
      email,
      password,
    });
    token = user.token;
    return user;
  };

  const getBuildings: UbiantService['getBuildings'] = async () => {
    const { data: buildings } = await client.get<Building[]>(
      '/buildings/mine/infos'
    );
    return buildings;
  };

  // const getAuthorizations: UbiantService['getAuthorizations'] = async ({ building }) => {
  //   const { data: authorizations } = await client.get<Authorization[]>(
  //     `/buildings/${building.buildingId}/authorizations`,
  //   );
  //   return authorizations;
  // };

  const isTokenValid: UbiantService['isTokenValid'] = () => {
    if (!token) {
      return false;
    }
    const tokenData = jwt.decode(token) as UbiantToken;
    const expirationDate = moment.unix(tokenData.exp);
    return moment().add(20, 'minutes').isBefore(expirationDate);
  };

  return {
    login,
    getBuildings,
    isTokenValid,
    // getAuthorizations,
  };
}
