import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import Model from '../../model/model.module';
import { Entrance } from '../../entrance/entities/entrance.entity';
import { Apartments } from '../../apartments/entities/apartment.entity';

@Entity('Floor')
export class Floor extends Model {
  @Column({})
  floor_number: number;

  @ManyToOne((type) => Entrance, (entrance) => entrance.floors, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'entrance_id' })
  entrance: Entrance;

  @Column()
  entrance_id: number;

  @OneToMany((type) => Apartments, (apartment) => apartment.floor)
  apartments: Apartments[];
}
