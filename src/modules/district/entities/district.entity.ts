import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import Model from '../../model/model.module';
import { Regions } from '../../region/entities/region.entity';

@Entity('Districts')
export class District extends Model {
  @Column()
  name: string;
  @ManyToOne((type) => Regions, (region) => region.district, {
    cascade: ['insert', 'update'],
  })
  @JoinColumn({ name: 'region_id' })
  region: Regions[];
}
