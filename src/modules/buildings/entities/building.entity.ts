import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import Model from '../../model/model.module';
import { Towns } from '../../towns/entities/town.entity';
import { Entrance } from '../../entrance/entities/entrance.entity';
import { FileUpload } from 'src/modules/file-upload/entities/file-upload.entity';
import { BuildingItems } from './buildingitems.entity';

@Entity('Buildings')
export class Buildings extends Model {
  @ManyToOne((type) => Towns, (town) => town.buildings)
  @JoinColumn({ name: 'town_id' })
  towns: Towns;

  @Column()
  town_id: number;

  @Column()
  name: string;

  @Column()
  entrance_number: number;

  @Column()
  floor_number: number;

  @OneToMany((type) => Entrance, (entrance) => entrance.buildings)
  entrances: Entrance[];

  @Column()
  apartment_number: number;

  @Column()
  mk_price: number;

  @OneToOne((type) => FileUpload, (fileUpload) => fileUpload.building, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'file_id' })
  file: FileUpload;

  @Column({ nullable: true })
  file_id: number;

  @OneToMany((type) => BuildingItems, (buildingItems) => buildingItems.building)
  buildingItems: BuildingItems;
}
