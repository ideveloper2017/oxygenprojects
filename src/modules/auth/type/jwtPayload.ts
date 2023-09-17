import {Roles} from "../../roles/entities/role.entity";


export interface AccessTokenPayload {
  userId: number;
  roles: Roles;
}

export interface RefreshTokenPayload {
  userId: number;
  tokenVersion: number;
}
