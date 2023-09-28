import { Column, Entity } from 'typeorm';
import Model from '../../model/model.module';

@Entity('UserTowns')
export class UserTowns extends Model {
  @Column()
  usersId: number;

  @Column()
  townsId: number;
}
