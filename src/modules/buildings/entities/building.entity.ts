import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import Model from '../../model/model.module';
import { Towns } from '../../towns/entities/town.entity';
import { Entrance } from '../../entrance/entities/entrance.entity';
import { FileUpload } from 'src/modules/file-upload/entities/file-upload.entity';

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
  
  @OneToMany((type) => FileUpload, (fileUpload) => fileUpload.building)
  files: FileUpload[]
}
