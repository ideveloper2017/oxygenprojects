import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import Model from '../../model/model.module';
import { Buildings } from './building.entity';

@Entity('BuildingItems')
export class BuildingItems extends Model {
  @ManyToOne((type) => Buildings, (building) => building)
  @JoinColumn({ name: 'building_id' })
  building: Buildings;

  @Column()
  building_id: number;

  @Column()
  mk_price: number;

  @Column()
  mk_price_usd: number;

  @Column()
  createBuildingDate: Date;

  @Column({ type: 'text', nullable: true })
  note_action: string;

  @Column({ default: true })
  is_active: boolean;
}
