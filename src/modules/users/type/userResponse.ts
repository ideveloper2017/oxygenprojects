import {Users} from "../entities/user.entity";

export type UserResponse = Omit<Users, 'created_at' | 'updated_at' | 'password'>;
