import { Column, Entity, OneToMany } from 'typeorm';
import Model from '../../model/model.module';
import { Buildings } from '../../buildings/entities/building.entity';

@Entity('Towns')
export class Towns extends Model {
  @Column()
  name: string;

  @Column()
  region_id: number;

  @Column()
  district_id: number;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  contact_number: string;

  @Column({ nullable: true })
  logo: string;

  @OneToMany((type) => Buildings, (building) => building.towns)
  buildings: Buildings[];
}
