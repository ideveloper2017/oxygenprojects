import { UserRole } from '../../roles/entities/role.entity';

export interface AccessTokenPayload {
  userId: number;
  role: UserRole;
}

export interface RefreshTokenPayload {
  userId: number;
  tokenVersion: number;
}
