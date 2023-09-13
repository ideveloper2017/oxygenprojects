import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import Model from '../../model/model.module';
import { Buildings } from '../../buildings/entities/building.entity';
import { Floor } from '../../floor/entities/floor.entity';

@Entity('Entrances')
export class Entrance extends Model {
  @Column({})
  entrance_number: number;

  @ManyToOne((type) => Buildings, (building) => building.entrances)
  @JoinColumn({ name: 'building_id' })
  buildings: Buildings;

  @Column()
  building_id: number;

  @OneToMany((type) => Floor, (floor) => floor.entrance, {
    onDelete: 'CASCADE',
  })
  floors: Floor[];
}
